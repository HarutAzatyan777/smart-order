const express = require('express');
const router = express.Router();
const cors = require("cors");
const { db } = require('../../admin');
const { FieldValue, FieldPath } = require('firebase-admin/firestore');
const {
  createOrderWithItems,
  deriveOrderStatus,
  updateItems,
  timestampFieldForStatus
} = require('../services/orderService');
const {
  getRoutingConfig,
  getStationsMap,
  resolveStationForItem
} = require('../services/stationsService');

// Enable CORS for all routes inside this router
router.use(cors({ origin: true }));

// ===============================
// Helper: Log History
// ===============================
async function logHistory(orderId, action, data = {}) {
  return db.collection("orders")
    .doc(orderId)
    .collection("history")
    .add({
      action,
      ...data,
      timestamp: FieldValue.serverTimestamp()
    });
}

// ===============================
// CREATE ORDER (Waiter)
// ===============================
router.post('/', async (req, res) => {
  try {
    const { tableId, waiterName, waiterId, items, notes } = req.body;

    if (!tableId) {
      return res.status(400).send({ error: "Table is required" });
    }
    if (!items || items.length === 0) {
      return res.status(400).send({ error: "Missing items" });
    }

    const tableDoc = await db.collection("tables").doc(tableId).get();
    if (!tableDoc.exists || tableDoc.data().active === false) {
      return res.status(400).send({ error: "Table not found or inactive" });
    }

    const number = tableDoc.data().number;
    if (!number) {
      return res.status(400).send({ error: "Table is missing a number" });
    }

    const routingConfig = await getRoutingConfig();
    const stationsMap = await getStationsMap({ includeInactive: true });

    const normalizedItems = Array.isArray(items) ? items : [];

    const result = await createOrderWithItems(
      {
        table: number,
        tableNumber: number,
        tableId,
        waiterName: waiterName || "Waiter",
        waiterId: waiterId || null,
        items: normalizedItems,
        notes: notes || ""
      },
      {
        routingConfig,
        stationsMap,
        stationResolver: (item) => resolveStationForItem(item, routingConfig, stationsMap)
      }
    );

    await logHistory(result.id, "order_created", {
      table: number,
      tableId,
      waiterName
    });

    res.status(201).send({
      id: result.id,
      status: result.status,
      message: "Order created successfully"
    });

  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// GET ORDERS (ALL or FILTERED)
// ===============================
router.get('/', async (req, res) => {
  try {
    const { status, table } = req.query;
    let queryRef = db.collection("orders");

    if (status) queryRef = queryRef.where("status", "==", status);
    if (table) queryRef = queryRef.where("table", "==", Number(table));

    // FIX: Sorting by root-level createdAt
    const snapshot = await queryRef.orderBy("createdAt", "desc").get();

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(list);

  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// UPDATE ORDER STATUS (limited manual overrides)
// ===============================
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).send({ error: "Missing status" });
    }

    const normalized = String(status).toLowerCase();
    const allowedManual = new Set(["cancelled", "delivered", "closed"]);

    if (!allowedManual.has(normalized)) {
      return res.status(400).send({
        error: "Order status is derived from items. Use item updates instead."
      });
    }

    const docRef = db.collection("orders").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const data = doc.data() || {};
    const itemIds = Array.isArray(data.items)
      ? data.items.map((i) => i?.itemId).filter(Boolean)
      : [];

    // Handle cancellation separately to disable items
    if (normalized === "cancelled") {
      if (itemIds.length) {
        const chunkSize = 10;
        for (let i = 0; i < itemIds.length; i += chunkSize) {
          const chunk = itemIds.slice(i, i + chunkSize);
          const snap = await db
            .collection("kitchenItems")
            .where(FieldPath.documentId(), "in", chunk)
            .get();

          const batch = db.batch();
          snap.docs.forEach((d) => {
            batch.update(d.ref, {
              active: false,
              orderStatus: "cancelled",
              updatedAt: FieldValue.serverTimestamp()
            });
          });
          await batch.commit();
        }
      }

      await docRef.update({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
        "timestamps.cancelledAt": FieldValue.serverTimestamp()
      });

      await logHistory(id, "status_changed", {
        oldStatus: data.status,
        newStatus: "cancelled"
      });

      return res.status(200).send({
        id,
        status: "cancelled",
        message: "Order cancelled"
      });
    }

    // Mark all items delivered / closed
    if (itemIds.length) {
      await updateItems(itemIds, { status: "delivered" });
    }

    const now = FieldValue.serverTimestamp();
    const updates = {
      status: "delivered",
      updatedAt: now,
      "timestamps.deliveredAt": now
    };

    if (normalized === "closed") {
      updates.status = "closed";
      updates["timestamps.closedAt"] = now;
    }

    await docRef.update(updates);

    await logHistory(id, "status_changed", {
      oldStatus: data.status,
      newStatus: updates.status
    });

    res.status(200).send({
      id,
      status: updates.status,
      message: "Order updated"
    });

  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// GET A SINGLE ORDER + HISTORY
// ===============================
router.get('/:id', async (req, res) => {
  try {
    const docRef = db.collection("orders").doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const historySnap = await docRef
      .collection("history")
      .orderBy("timestamp", "asc")
      .get();

    const history = historySnap.docs.map(h => ({
      id: h.id,
      ...h.data()
    }));

    res.status(200).send({
      id: doc.id,
      ...doc.data(),
      history
    });

  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');
const { updateItems, createOrderWithItems } = require('../services/orderService');
const {
  getRoutingConfig,
  getStationsMap,
  resolveStationForItem
} = require('../services/stationsService');

// =======================================
// WAITER: Public roster (no PINs)
// =======================================
router.get('/waiters', async (_req, res) => {
  try {
    const snapshot = await db.collection("waiters").get();
    const waiters = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(w => w.active !== false)
      .map(w => ({ id: w.id, name: w.name || "Waiter" }));

    res.status(200).send(waiters);
  } catch (error) {
    console.error("Waiter roster error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// WAITER: Login (server-side PIN check)
// =======================================
router.post('/login', async (req, res) => {
  try {
    const { waiterId, pin } = req.body || {};

    if (!waiterId || !pin) {
      return res.status(400).send({ error: "Missing waiter ID or PIN" });
    }

    const docRef = db.collection("waiters").doc(waiterId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    const data = doc.data() || {};

    if (data.active === false) {
      return res.status(403).send({ error: "Waiter is inactive" });
    }

    const storedPin = data.pin ? String(data.pin).trim() : "";
    if (storedPin !== String(pin).trim()) {
      return res.status(401).send({ error: "Invalid credentials" });
    }

    res.status(200).send({
      id: doc.id,
      name: data.name || "Waiter"
    });
  } catch (error) {
    console.error("Waiter login error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// WAITER: Create New Order
// =======================================
router.post('/create', async (req, res) => {
  try {
    const { table, tableId, items, notes, waiterId, waiterName } = req.body;

    if ((!table && !tableId) || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({ error: "Missing table or items" });
    }

    if (!waiterId || !waiterName) {
      return res.status(400).send({ error: "Missing waiter identity" });
    }

    let tableNumber = Number(table) || null;
    let resolvedTableId = tableId || null;

    if (tableId) {
      const tableDoc = await db.collection("tables").doc(tableId).get();
      if (!tableDoc.exists || tableDoc.data().active === false) {
        return res.status(400).send({ error: "Table not found or inactive" });
      }
      tableNumber = tableDoc.data().number;
      resolvedTableId = tableDoc.id;
    } else if (!tableNumber) {
      return res.status(400).send({ error: "Table number is required" });
    }

    const routingConfig = await getRoutingConfig();
    const stationsMap = await getStationsMap({ includeInactive: true });

    const result = await createOrderWithItems(
      {
        table: tableNumber,
        tableId: resolvedTableId,
        waiterId,
        waiterName,
        items,
        notes: notes || "",
        status: "submitted"
      },
      {
        routingConfig,
        stationsMap,
        stationResolver: (item) => resolveStationForItem(item, routingConfig, stationsMap)
      }
    );

    res.status(201).send({
      id: result.id,
      status: result.status,
      message: "Order sent to kitchen"
    });

  } catch (error) {
    console.error("Waiter create order error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// WAITER: Get ONLY their own orders
// =======================================
router.get('/', async (req, res) => {
  try {
    const { waiterId } = req.query;

    if (!waiterId) {
      return res.status(400).send({ error: "Missing waiterId" });
    }

    let query = db.collection("orders").where("waiterId", "==", waiterId);

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(orders);

  } catch (error) {
    console.error("Waiter get orders error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// UPDATE ITEMS
// =======================================
router.patch('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items) {
      return res.status(400).send({ error: "Missing items" });
    }

    await db.collection("orders").doc(id).update({
      items,
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({ message: "Items updated", id });

  } catch (error) {
    console.error("Waiter update items error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// MARK DELIVERED
// =======================================
router.patch('/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;

    const orderDoc = await db.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const itemIds = Array.isArray(orderDoc.data().items)
      ? orderDoc.data().items.map((i) => i?.itemId).filter(Boolean)
      : [];

    if (itemIds.length) {
      await updateItems(itemIds, { status: "delivered" });
    } else {
      await db.collection("orders").doc(id).update({
        status: "delivered",
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    res.status(200).send({ message: "Order delivered", id });

  } catch (error) {
    console.error("Waiter deliver error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// DELIVER SINGLE ITEM
// =======================================
router.patch('/:orderId/items/:itemId/deliver', async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    if (!orderId || !itemId) {
      return res.status(400).send({ error: "Missing order or item" });
    }

    const result = await updateItems([itemId], { status: "delivered" });

    res.status(200).send({
      message: "Item marked delivered",
      updated: result.updated
    });
  } catch (error) {
    console.error("Waiter deliver item error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================================
// CANCEL ORDER
// =======================================
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("orders").doc(id).update({
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({ message: "Order cancelled", id });

  } catch (error) {
    console.error("Waiter cancel error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

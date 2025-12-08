const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// Allowed order status flow
const ORDER_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "delivered",
  "closed",
  "cancelled"
];

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
// CREATE ORDER  (Waiter)
// ===============================
router.post('/', async (req, res) => {
  try {
    const { table, waiterName, items, notes } = req.body;

    if (!table || !items || items.length === 0) {
      return res.status(400).send({ error: "Missing table or items" });
    }

    const orderData = {
      table,
      waiterName: waiterName || "Waiter",
      items,
      notes: notes || "",
      status: "new",

      // Full timeline structure
      timestamps: {
        createdAt: FieldValue.serverTimestamp(),
        acceptedAt: null,
        preparingAt: null,
        readyAt: null,
        deliveredAt: null,
        closedAt: null
      }
    };

    const docRef = await db.collection("orders").add(orderData);

    // Add history entry
    await logHistory(docRef.id, "order_created", {
      table,
      waiterName
    });

    res.status(201).send({
      id: docRef.id,
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
    let query = db.collection("orders");

    if (status) query = query.where("status", "==", status);
    if (table) query = query.where("table", "==", Number(table));

    const snapshot = await query
      .orderBy("timestamps.createdAt", "desc")
      .get();

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
// UPDATE ORDER STATUS
// (Kitchen + Waiter + Admin)
// ===============================
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).send({ error: "Invalid or missing status" });
    }

    const docRef = db.collection("orders").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    // Update timeline timestamp automatically
    const timeField = {
      accepted: "acceptedAt",
      preparing: "preparingAt",
      ready: "readyAt",
      delivered: "deliveredAt",
      closed: "closedAt",
      cancelled: "cancelledAt"
    }[status] || null;

    const updates = {
      status,
      [`timestamps.${timeField}`]: FieldValue.serverTimestamp()
    };

    await docRef.update(updates);

    // History log
    await logHistory(id, "status_changed", {
      oldStatus: doc.data().status,
      newStatus: status
    });

    res.status(200).send({
      id,
      status,
      message: "Status updated"
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

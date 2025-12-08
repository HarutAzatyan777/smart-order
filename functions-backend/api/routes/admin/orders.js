const express = require('express');
const router = express.Router();

const { db } = require('../../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// ===========================
// GET ALL ORDERS (optional filters: status, table)
// ===========================
router.get('/', async (req, res) => {
  try {
    const { status, table } = req.query;

    let query = db.collection('orders');

    if (status) query = query.where('status', '==', status);
    if (table) query = query.where('table', '==', Number(table));

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(list);
  } catch (err) {
    console.error("Admin GET orders error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// GET SINGLE ORDER
// ===========================
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    res.send({ id: doc.id, ...doc.data() });

  } catch (err) {
    console.error("Admin GET single order error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// UPDATE ORDER (status or items)
// ===========================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    updates.updatedAt = FieldValue.serverTimestamp();

    await db.collection('orders').doc(id).update(updates);

    res.status(200).send({
      id,
      message: "Order updated"
    });

  } catch (err) {
    console.error("Admin update order error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// DELETE ORDER
// ===========================
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('orders').doc(req.params.id).delete();

    res.status(200).send({
      message: "Order deleted",
      id: req.params.id
    });

  } catch (err) {
    console.error("Admin delete order error:", err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;

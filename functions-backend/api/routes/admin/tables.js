const express = require('express');
const router = express.Router();

const { db } = require('../../../admin');
const { FieldValue } = require('firebase-admin/firestore');

const normalizeNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
};

const ACTIVE_CLOSE_STATUSES = new Set(["closed", "cancelled", "canceled", "delivered"]);

// List tables
router.get('/', async (_req, res) => {
  try {
    const snap = await db.collection('tables').orderBy('number', 'asc').get();
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).send({ tables: list });
  } catch (err) {
    console.error("Admin tables list error:", err);
    res.status(500).send({ error: err.message });
  }
});

// Create table
router.post('/', async (req, res) => {
  try {
    const { number, label, active = true } = req.body || {};
    const num = normalizeNumber(number);
    if (!num || !label?.trim()) {
      return res.status(400).send({ error: "Table number and label required" });
    }

    const existing = await db.collection('tables').where('number', '==', num).limit(1).get();
    if (!existing.empty) {
      return res.status(400).send({ error: "Table number already exists" });
    }

    const docRef = await db.collection('tables').add({
      number: num,
      label: label.trim(),
      active: Boolean(active),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({ id: docRef.id, message: "Table created" });
  } catch (err) {
    console.error("Admin create table error:", err);
    res.status(500).send({ error: err.message });
  }
});

// Update table
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { number, label, active } = req.body || {};
    const updates = {};
    if (number !== undefined) {
      const num = normalizeNumber(number);
      if (!num) return res.status(400).send({ error: "Invalid table number" });
      const existing = await db.collection('tables').where('number', '==', num).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== id) {
        return res.status(400).send({ error: "Table number already exists" });
      }
      updates.number = num;
    }
    if (label !== undefined) updates.label = String(label || "").trim();
    if (active !== undefined) updates.active = Boolean(active);
    updates.updatedAt = FieldValue.serverTimestamp();

    await db.collection('tables').doc(id).update(updates);
    res.status(200).send({ id, message: "Table updated" });
  } catch (err) {
    console.error("Admin update table error:", err);
    res.status(500).send({ error: err.message });
  }
});

// Delete table
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tableDoc = await db.collection('tables').doc(id).get();
    if (!tableDoc.exists) return res.status(404).send({ error: "Table not found" });
    const number = tableDoc.data().number;

    const activeOrders = await db
      .collection('orders')
      .where('table', '==', number)
      .limit(1)
      .get();
    if (!activeOrders.empty) {
      const order = activeOrders.docs[0].data();
      if (!ACTIVE_CLOSE_STATUSES.has(order.status)) {
        return res.status(400).send({ error: "Cannot delete table with active orders" });
      }
    }

    await db.collection('tables').doc(id).delete();
    res.status(200).send({ id, message: "Table deleted" });
  } catch (err) {
    console.error("Admin delete table error:", err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;

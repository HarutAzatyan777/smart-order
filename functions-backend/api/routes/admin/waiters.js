const express = require('express');
const router = express.Router();

const { db } = require('../../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// Create waiter
router.post('/', async (req, res) => {
  try {
    const { name, pin } = req.body;

    if (!name || !pin) {
      return res.status(400).send({ error: "Missing name or pin" });
    }

    const docRef = await db.collection("waiters").add({
      name,
      pin,
      active: true,
      createdAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({
      id: docRef.id,
      message: "Waiter created successfully"
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get waiters
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection("waiters").get();
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete waiter
router.delete('/:id', async (req, res) => {
  try {
    await db.collection("waiters").doc(req.params.id).delete();
    res.status(200).send({ message: "Waiter deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

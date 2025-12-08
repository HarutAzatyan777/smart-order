const express = require('express');
const router = express.Router();

const { db } = require('../../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// ===========================
// GET ALL MENU ITEMS
// ===========================
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('menu')
      .orderBy('createdAt', 'desc')
      .get();

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(list);
  } catch (err) {
    console.error("Admin menu GET error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// CREATE MENU ITEM
// ===========================
router.post('/', async (req, res) => {
  try {
    const { name, price, category, description, available } = req.body;

    if (!name || !price || !category) {
      return res.status(400).send({ error: 'Missing name, price or category' });
    }

    const docRef = await db.collection('menu').add({
      name,
      price,
      category,
      description: description || '',
      available: available ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({
      id: docRef.id,
      message: "Menu item created"
    });
  } catch (err) {
    console.error("Admin create menu error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// UPDATE MENU ITEM
// ===========================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const docRef = db.collection('menu').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Item not found" });
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await docRef.update(updates);

    res.status(200).send({
      id,
      message: "Menu item updated"
    });
  } catch (err) {
    console.error("Admin update menu error:", err);
    res.status(500).send({ error: err.message });
  }
});

// ===========================
// DELETE MENU ITEM
// ===========================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('menu').doc(id).delete();

    res.status(200).send({
      id,
      message: "Menu item deleted"
    });
  } catch (err) {
    console.error("Admin delete menu error:", err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;

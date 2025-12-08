const express = require('express');
const router = express.Router();

const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// ==========================
// POST → Add Menu Item
// ==========================
router.post('/', async (req, res) => {
  try {
    const { name, price, category, description, available } = req.body;

    if (!name || !price || !category) {
      return res.status(400).send({ error: 'Missing required fields: name, price, category' });
    }

    const docRef = await db.collection('menu').add({
      name,
      price,
      category,
      description: description || "",
      available: available !== false,
      createdAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({
      id: docRef.id,
      message: "Menu item added successfully"
    });

  } catch (error) {
    console.error("addMenuItem error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==========================
// GET → Get Menu List
// ==========================
router.get('/', async (req, res) => {
  try {
    const snapshot = await db
      .collection('menu')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(items);

  } catch (error) {
    console.error("getMenuItems error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==========================
// DELETE → Delete Menu Item
// ==========================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection('menu').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Menu item not found" });
    }

    await docRef.delete();

    res.status(200).send({
      id,
      message: "Menu item deleted successfully"
    });

  } catch (error) {
    console.error("deleteMenuItem error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

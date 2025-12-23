const express = require('express');
const router = express.Router();

const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');


// =====================================================================
// =====================  MENU CRUD ROUTES =============================
// =====================================================================

// ADD MENU ITEM
router.post('/', async (req, res) => {
  try {
    const { name, price, category, description, available, imageUrl, translations } = req.body;

    if (!name || !price || !category) {
      return res.status(400).send({
        error: 'Missing required fields: name, price, category'
      });
    }

    const docRef = await db.collection('menu').add({
      name,
      price,
      category,
      description: description || "",
      translations: translations || null,
      imageUrl: imageUrl || null,
      available: available ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
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

const localizeItem = (item, lang = "en") => {
  const safeLang = ["en", "hy"].includes(String(lang).toLowerCase()) ? String(lang).toLowerCase() : "en";
  const tx = item.translations || {};
  const pickField = (field) => {
    const fromLang = tx[safeLang]?.[field];
    if (fromLang && String(fromLang).trim()) return String(fromLang).trim();
    const fromEn = tx.en?.[field];
    if (fromEn && String(fromEn).trim()) return String(fromEn).trim();
    return item[field];
  };

  return {
    ...item,
    displayName: pickField("name"),
    displayDescription: pickField("description"),
    displayCategory: pickField("category")
  };
};

// CATEGORY ORDER (public)
const categoryOrderDoc = db.collection("metadata").doc("categoryOrder");
router.get("/categories/order", async (_req, res) => {
  try {
    const doc = await categoryOrderDoc.get();
    const order = doc.exists ? doc.data()?.order || [] : [];
    res.status(200).send({ order: Array.isArray(order) ? order : [] });
  } catch (error) {
    console.error("getCategoryOrder error:", error);
    res.status(500).send({ error: error.message });
  }
});

// GET ALL MENU ITEMS
router.get('/', async (req, res) => {
  try {
    const { lang } = req.query;
    const { category, available } = req.query;

    let query = db.collection('menu');

    if (category) query = query.where("category", "==", category);
    if (available !== undefined) {
      query = query.where("available", "==", available === 'true');
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const itemsRaw = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const items = lang ? itemsRaw.map((item) => localizeItem(item, lang)) : itemsRaw;

    res.status(200).send(items);

  } catch (error) {
    console.error("getMenuItems error:", error);
    res.status(500).send({ error: error.message });
  }
});

// GROUPED BY CATEGORY
router.get('/grouped', async (req, res) => {
  try {
    const { lang } = req.query;
    const snapshot = await db.collection('menu')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).map((item) => (lang ? localizeItem(item, lang) : item));

    const grouped = {};
    items.forEach(item => {
      const key = item.category || "Uncategorized";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    res.status(200).send(grouped);

  } catch (error) {
    console.error("getGroupedMenu error:", error);
    res.status(500).send({ error: error.message });
  }
});

// UPDATE MENU ITEM
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const docRef = db.collection('menu').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Menu item not found" });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    await docRef.update(updates);

    res.status(200).send({
      id,
      message: "Menu item updated successfully"
    });

  } catch (error) {
    console.error("updateMenuItem error:", error);
    res.status(500).send({ error: error.message });
  }
});

// DELETE MENU ITEM
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

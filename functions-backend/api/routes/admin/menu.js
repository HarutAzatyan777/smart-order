const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { Readable } = require('stream');
const router = express.Router();

const { db, bucket } = require('../../../admin');
const { FieldValue } = require('firebase-admin/firestore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const sanitizeFileName = (input = "") => {
  return input
    .toString()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

const categoriesDoc = db.collection("metadata").doc("categories");

const normalizeKey = (key = "") =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const readCategories = async () => {
  const doc = await categoriesDoc.get();
  const list = doc.exists ? doc.data()?.list || [] : [];
  return Array.isArray(list) ? list : [];
};

const writeCategories = async (list) => {
  await categoriesDoc.set({ list }, { merge: true });
};

const findCategory = (list, key) => list.find((c) => c.key === key);

// Multer + Firebase Functions: the emulator populates req.rawBody and consumes the stream.
// Recreate a readable stream from rawBody so multer can parse multipart data.
const restoreRawBodyForMulter = (req, res, next) => {
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    const stream = Readable.from(req.rawBody);
    stream.headers = req.headers;
    upload.single('image')(stream, res, (err) => {
      if (err) return next(err);
      req.file = stream.file;
      req.files = stream.files;
      req.body = stream.body;
      return next();
    });
  } else {
    upload.single('image')(req, res, next);
  }
};

// ===========================
// UPLOAD MENU IMAGE
// ===========================
router.post('/upload-image', restoreRawBodyForMulter, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "Image file is required" });
    }

    const safeName = sanitizeFileName(req.file.originalname) || `image-${Date.now()}`;
    const path = `menu/${Date.now()}-${safeName}`;
    const file = bucket.file(path);
    const downloadToken = randomUUID();

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    // Build download URL (use emulator host when present)
    const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    const baseUrl = storageHost
      ? `http://${storageHost}/v0/b/${bucket.name}/o`
      : `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o`;

    const url = `${baseUrl}/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;

    return res.status(201).send({
      url,
      path,
      downloadToken
    });
  } catch (err) {
    console.error("Upload menu image error:", err);
    return res
      .status(500)
      .send({ error: err.message || "Could not upload image" });
  }
});

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
    const { name, price, category, description, available, imageUrl, translations } = req.body;

    if (!name || !price || !category) {
      return res.status(400).send({ error: 'Missing name, price or category' });
    }

    const categories = await readCategories();
    if (!findCategory(categories, category)) {
      return res.status(400).send({ error: "Category does not exist" });
    }

    const docRef = await db.collection('menu').add({
      name,
      price,
      category,
      description: description || '',
      imageUrl: imageUrl || null,
      available: available ?? true,
      translations: translations || null,
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
// CATEGORIES CRUD & ORDER
// ===========================
router.get("/categories", async (_req, res) => {
  try {
    const list = await readCategories();
    res.status(200).send({ categories: list });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).send({ error: err.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { key, labels } = req.body || {};
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return res.status(400).send({ error: "Category key required" });
    if (!labels?.en) return res.status(400).send({ error: "English label required" });

    const list = await readCategories();
    if (findCategory(list, normalizedKey)) {
      return res.status(400).send({ error: "Category key already exists" });
    }

    const next = [...list, { key: normalizedKey, order: list.length, labels }];
    await writeCategories(next);
    res.status(201).send({ category: { key: normalizedKey, order: list.length, labels } });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).send({ error: err.message });
  }
});

router.put("/categories/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { labels } = req.body || {};
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return res.status(400).send({ error: "Category key required" });
    if (!labels?.en) return res.status(400).send({ error: "English label required" });

    const list = await readCategories();
    if (!findCategory(list, normalizedKey)) {
      return res.status(404).send({ error: "Category not found" });
    }

    const next = list.map((cat) =>
      cat.key === normalizedKey ? { ...cat, labels: { ...cat.labels, ...labels } } : cat
    );
    await writeCategories(next);
    res.status(200).send({ category: next.find((c) => c.key === normalizedKey) });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).send({ error: err.message });
  }
});

router.delete("/categories/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return res.status(400).send({ error: "Category key required" });

    const menuWithCategory = await db
      .collection("menu")
      .where("category", "==", normalizedKey)
      .limit(1)
      .get();
    if (!menuWithCategory.empty) {
      return res.status(400).send({ error: "Cannot delete category with menu items. Reassign first." });
    }

    const list = await readCategories();
    const next = list
      .filter((cat) => cat.key !== normalizedKey)
      .map((cat, idx) => ({ ...cat, order: idx }));
    await writeCategories(next);
    res.status(200).send({ categories: next });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).send({ error: err.message });
  }
});

router.patch("/categories/reorder", async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).send({ error: "Order must be an array of category keys" });
    }
    const list = await readCategories();
    const keyed = new Map(list.map((c) => [c.key, c]));
    const next = [];
    order.forEach((k, idx) => {
      const cat = keyed.get(k);
      if (cat) next.push({ ...cat, order: idx });
    });
    list.forEach((cat) => {
      if (!next.find((c) => c.key === cat.key)) {
        next.push({ ...cat, order: next.length });
      }
    });
    await writeCategories(next);
    res.status(200).send({ categories: next });
  } catch (err) {
    console.error("Reorder categories error:", err);
    res.status(500).send({ error: err.message });
  }
});

// Backward-compat: order-only endpoints
router.get("/categories/order", async (_req, res) => {
  try {
    const list = await readCategories();
    const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.status(200).send({ order: sorted.map((c) => c.key) });
  } catch (err) {
    console.error("Get category order error:", err);
    res.status(500).send({ error: err.message });
  }
});

router.patch("/categories/order", async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).send({ error: "Order must be an array of category keys" });
    }
    const list = await readCategories();
    const keyed = new Map(list.map((c) => [c.key, c]));
    const next = [];
    order.forEach((k, idx) => {
      const cat = keyed.get(k);
      if (cat) next.push({ ...cat, order: idx });
    });
    list.forEach((cat) => {
      if (!next.find((c) => c.key === cat.key)) {
        next.push({ ...cat, order: next.length });
      }
    });
    await writeCategories(next);
    res.status(200).send({ order: next.map((c) => c.key) });
  } catch (err) {
    console.error("Update category order error:", err);
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

    if (updates.category) {
      const categories = await readCategories();
      if (!findCategory(categories, updates.category)) {
        return res.status(400).send({ error: "Category does not exist" });
      }
    }

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

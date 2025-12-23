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

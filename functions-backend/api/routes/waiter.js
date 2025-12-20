const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');

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
    const { table, items, notes, waiterId, waiterName } = req.body;

    if (!table || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).send({ error: "Missing table or items" });
    }

    if (!waiterId || !waiterName) {
      return res.status(400).send({ error: "Missing waiter identity" });
    }

    const orderData = {
      table,
      items,
      notes: notes || "",
      waiterId,
      waiterName,
      status: "submitted",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("orders").add(orderData);

    res.status(201).send({
      id: docRef.id,
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

    await db.collection("orders").doc(id).update({
      status: "delivered",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({ message: "Order delivered", id });

  } catch (error) {
    console.error("Waiter deliver error:", error);
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

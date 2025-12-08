const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');

// ===============================
// GET → All NEW or ACTIVE orders
// ===============================
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    // Default shows "new" + "preparing"
    const statuses = status
      ? [status]
      : ["new", "preparing"];

    const snapshot = await db
      .collection("orders")
      .where("status", "in", statuses)
      .orderBy("createdAt", "asc") // kitchen sees oldest first
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(orders);

  } catch (error) {
    console.error("Kitchen Get Orders Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Mark as PREPARING
// ===============================
router.patch('/:id/preparing', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("orders").doc(id).update({
      status: "preparing",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({
      id,
      status: "preparing",
      message: "Order marked as PREPARING"
    });

  } catch (error) {
    console.error("Kitchen Preparing Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Mark as READY
// ===============================
router.patch('/:id/ready', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("orders").doc(id).update({
      status: "ready",
      readyAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({
      id,
      status: "ready",
      message: "Order marked as READY"
    });

  } catch (error) {
    console.error("Kitchen Ready Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Cancel order
// ===============================
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("orders").doc(id).update({
      status: "canceled",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({
      id,
      status: "canceled",
      message: "Order CANCELED by kitchen"
    });

  } catch (error) {
    console.error("Kitchen Cancel Error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

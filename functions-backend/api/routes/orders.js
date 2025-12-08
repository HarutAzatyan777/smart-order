const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue } = require('firebase-admin/firestore');
const { createOrderSchema } = require('../validators/orders.validator');

// =======================
// CREATE ORDER
// =======================
router.post('/', async (req, res) => {
  try {
    // Validate incoming order
    const parsed = createOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).send({
        error: parsed.error.format()
      });
    }

    const order = parsed.data;

    const docRef = await db.collection('orders').add({
      ...order,
      status: "new",                   // waiter sends order → kitchen receives
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({
      id: docRef.id,
      message: "Order created successfully"
    });

  } catch (error) {
    console.error("Order create error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================
// GET ORDERS (with filters)
// =======================
router.get('/', async (req, res) => {
  try {
    const { status, table } = req.query;
    let query = db.collection('orders');

    if (status) {
      query = query.where("status", "==", status);
    }

    if (table) {
      query = query.where("table", "==", Number(table));
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(list);

  } catch (error) {
    console.error("Order get error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================
// UPDATE ORDER STATUS
// kitchen → ready
// waiter → delivered
// =======================
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).send({ error: "Missing 'status' field" });
    }

    await db.collection('orders').doc(id).update({
      status,
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({
      message: "Status updated",
      id,
      status
    });

  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =======================
// GET SINGLE ORDER
// =======================
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    res.status(200).send({
      id: doc.id,
      ...doc.data()
    });

  } catch (error) {
    console.error("Get single order error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;

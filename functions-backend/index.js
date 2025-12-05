const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // allow all origins, can restrict later

admin.initializeApp();
const db = admin.firestore();

// 🔹 1️⃣ Create Order
exports.createOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send({ error: "Method Not Allowed" });
      }

      const order = req.body;
      if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        return res.status(400).send({ error: "Invalid order payload" });
      }

      const docRef = await db.collection("orders").add({
        ...order,
        status: "new",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(201).send({ id: docRef.id });
    } catch (error) {
      console.error("createOrder error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 🔹 2️⃣ Get Orders
exports.getOrders = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "GET") {
        return res.status(405).send({ error: "Method Not Allowed" });
      }

      const snapshot = await db
        .collection("orders")
        .orderBy("createdAt", "desc")
        .get();

      const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).send(orders);
    } catch (error) {
      console.error("getOrders error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 🔹 3️⃣ Update Order Status
exports.updateOrderStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "PUT") {
        return res.status(405).send({ error: "Method Not Allowed" });
      }

      const { orderId, status } = req.body;
      if (!orderId || !status) {
        return res.status(400).send({ error: "Missing orderId or status" });
      }

      await db.collection("orders").doc(orderId).update({ status });
      res.status(200).send({ id: orderId, status });
    } catch (error) {
      console.error("updateOrderStatus error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});


// 🔹 5️⃣ Add Menu Item

// 🔹 5️⃣ Add Menu Item
exports.addMenuItem = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send({ error: "Method Not Allowed" });
      }

      const { name, price, category, description, available } = req.body;

      if (!name || !price || !category) {
        return res.status(400).send({ error: "Missing required fields" });
      }

      const docRef = await db.collection("menu").add({
        name,
        price,
        category,
        description: description || "",
        available: available !== false, // default true
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(201).send({ id: docRef.id, message: "Menu item added" });
    } catch (error) {
      console.error("addMenuItem error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});


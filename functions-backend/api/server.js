const express = require('express');
const cors = require('cors');

// Routers
const ordersRouter = require('./routes/orders');
const menuRouter = require('./routes/menu');
const kitchenRouter = require('./routes/kitchen');
const waiterRouter = require('./routes/waiter');
const adminRouter = require('./routes/admin'); // <-- Admin index.js combines all admin routes

const app = express();

// CORS (allows any origin; safe for Firebase cloud functions)
app.use(cors({ origin: true }));

// Parse JSON input
app.use(express.json());

// Health-check
app.get('/health', (req, res) => {
  res.send({ status: "OK", timestamp: Date.now() });
});

// ==========================
// PUBLIC ROUTES
// ==========================
app.use('/orders', ordersRouter);
app.use('/menu', menuRouter);

// Kitchen panel
app.use('/kitchen', kitchenRouter);

// Waiter panel
app.use('/waiter', waiterRouter);

// ==========================
// ADMIN ROUTES (protected by adminAuth middleware inside adminRouter)
// ==========================
app.use('/admin', adminRouter);

// ==========================
// GLOBAL ERROR HANDLER (safe for production)
// ==========================
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).send({
    error: "Internal server error",
    details: err.message
  });
});

module.exports = app;

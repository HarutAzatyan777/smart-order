const express = require('express');
const cors = require('cors');

// Routers
const ordersRouter = require('./routes/orders');
const menuRouter = require('./routes/menu');
const kitchenRouter = require('./routes/kitchen');
const waiterRouter = require('./routes/waiter');
const adminRouter = require('./routes/admin');
const waitersAdminRouter = require('./routes/admin/waiters'); // <-- ADD THIS

const app = express();

// CORS
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.send({ status: "OK", timestamp: Date.now() });
});

// Public routes
app.use('/orders', ordersRouter);
app.use('/menu', menuRouter);
app.use('/kitchen', kitchenRouter);
app.use('/waiter', waiterRouter);

//image upload

// Admin
app.use('/admin', adminRouter);
app.use('/waiters', waitersAdminRouter);  // <-- REGISTER THE ROUTE HERE

// Error handler
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).send({
    error: "Internal server error",
    details: err.message
  });
});

module.exports = app;

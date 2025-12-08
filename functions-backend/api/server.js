const express = require('express');
const cors = require('cors');

const ordersRouter = require('./routes/orders');
const menuRouter = require('./routes/menu');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use('/orders', ordersRouter);
app.use('/menu', menuRouter);

module.exports = app;

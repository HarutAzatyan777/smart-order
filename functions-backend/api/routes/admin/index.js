const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');

// Apply adminAuth to all admin panel routes
router.use(adminAuth);

// Admin user info
router.get('/me', (req, res) => {
  res.status(200).send({
    uid: req.user.uid,
    email: req.user.email,
    role: "admin"
  });
});

// Subrouters
router.use('/waiters', require('./waiters'));
router.use('/menu', require('./menu'));
router.use('/orders', require('./orders'));

module.exports = router;

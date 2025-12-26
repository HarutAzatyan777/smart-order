const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');

// ==========================
// OPEN ROUTES (NO AUTH)
// ==========================

// Admin login route (must NOT be protected)
router.use('/login', require('./login'));


// ==========================
// PROTECTED ROUTES (AUTH REQUIRED)
// ==========================

router.use(adminAuth);  // <-- Protect everything below


// Admin user info
router.get('/me', (req, res) => {
  res.status(200).send({
    uid: req.user.uid,
    email: req.user.email,
    role: "admin"
  });
});

// Subrouters (protected)
router.use('/waiters', require('./waiters'));
router.use('/menu', require('./menu'));
router.use('/orders', require('./orders'));
router.use('/tables', require('./tables'));
router.use('/stations', require('./stations'));
router.use('/analytics', require('./analytics'));

module.exports = router;

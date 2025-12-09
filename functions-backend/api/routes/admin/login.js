const express = require("express");
const router = express.Router();

// Hardcoded admin for now
const ADMIN_EMAIL = "admin@smartorder.com";
const ADMIN_PIN = "Admin.1234";  // change later

router.post("/", async (req, res) => {
  const { email, pin } = req.body;

  if (email !== ADMIN_EMAIL || pin !== ADMIN_PIN) {
    return res.status(401).send({ error: "Invalid admin credentials" });
  }

  // create simple token
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

  res.status(200).send({
    token,
    email
  });
});

module.exports = router;

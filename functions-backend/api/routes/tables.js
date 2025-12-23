const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const cors = require("cors");

router.use(cors({ origin: true }));

router.get('/', async (_req, res) => {
  try {
    const snap = await db.collection('tables').orderBy('number', 'asc').get();
    const list = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        available: data.active !== false
      };
    });
    res.status(200).send({ tables: list });
  } catch (err) {
    console.error("Public tables list error:", err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;

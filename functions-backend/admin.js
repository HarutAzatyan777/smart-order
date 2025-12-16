const admin = require("firebase-admin");

// Use Application Default Credentials (Cloud Run/Firebase Functions service account or local ADC).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

module.exports = { admin, db };

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://swift-stack-444307-m4-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

module.exports = { admin, db };

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),

    // Realtime Database (optional)
    databaseURL: "https://swift-stack-444307-m4-default-rtdb.firebaseio.com",

    // Firebase Storage bucket (IMPORTANT: must use appspot.com)
    storageBucket: "swift-stack-444307-m4.appspot.com"
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(); // storage reference

module.exports = { admin, db, bucket };

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // <-- քո JSON ֆայլը

// Init Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swift-stack-444307-m4-default-rtdb.firebaseio.com",
});

const db = admin.firestore();

(async () => {
  try {
    console.log("🔥 Testing Firebase Admin...");

    // Test serverTimestamp
    const docRef = await db.collection("test_collection").add({
      message: "Hello Firebase!",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Document created:", docRef.id);

    // Read it back (wait 1 sec for timestamp)
    setTimeout(async () => {
      const snap = await docRef.get();
      console.log("📄 Saved data:", snap.data());

      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
})();

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ENTER ADMIN EMAIL HERE:
const ADMIN_EMAIL = "admin@smartorder.com";

async function setAdmin() {
  try {
    // 1) Find user by email
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);

    // 2) Assign admin role
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

    console.log(`✔ Admin role assigned to: ${ADMIN_EMAIL}`);
    console.log(`UID: ${user.uid}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

setAdmin();

const admin = require("firebase-admin");

// Derive project ID for default bucket fallback
const getProjectId = () => {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    const cfg = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    if (cfg.projectId) return cfg.projectId;
  } catch {
    // ignore parse errors
  }
  // Last resort: default from .firebaserc
  return "swift-stack-444307-m4";
};

const bucketName =
  process.env.STORAGE_BUCKET ||
  process.env.GCLOUD_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  `${getProjectId()}.appspot.com`;

// Use Application Default Credentials (Cloud Run/Firebase Functions service account or local ADC).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: bucketName
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(bucketName);

// Log connection mode for debugging
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST !== undefined;
if (isEmulator) {
  console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else {
  console.log(`☁️ Using production Firestore (Project: ${getProjectId()})`);
}

// Firestore settings to avoid timeout issues
db.settings({ 
  ignoreUndefinedProperties: true,
  preferRest: false 
});

module.exports = { admin, db, bucket };

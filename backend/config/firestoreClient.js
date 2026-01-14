const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.FIRESTORE_EMULATOR_HOST && { 
    host: process.env.FIRESTORE_EMULATOR_HOST, 
    ssl: false 
  }),
});

// Log connection mode for debugging
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else {
  console.log(`☁️ Using production Firestore (Project: ${process.env.GCLOUD_PROJECT})`);
}

module.exports = firestore;

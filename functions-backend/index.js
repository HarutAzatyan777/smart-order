const functions = require('firebase-functions');
const app = require('./api/server');

// Expose as single function
exports.api = functions.https.onRequest(app);

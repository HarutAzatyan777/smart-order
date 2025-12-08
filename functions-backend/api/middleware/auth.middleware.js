const admin = require("../../admin").admin;

// Extract Bearer token from headers
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  if (!authHeader.startsWith("Bearer ")) return null;

  return authHeader.split(" ")[1];
}

// Verify Firebase ID Token
async function verifyUser(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).send({ error: "Missing authorization token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded; // store user data
    next();

  } catch (error) {
    console.error("Auth verify error:", error);
    return res.status(401).send({ error: "Invalid or expired token" });
  }
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send({ error: "Admin access only" });
  }
  next();
}

module.exports = { verifyUser, requireAdmin };

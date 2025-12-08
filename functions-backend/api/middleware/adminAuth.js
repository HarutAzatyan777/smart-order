const { admin } = require("../../admin");

// Extract Bearer token
function getToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  return header.split(" ")[1];
}

module.exports = async function adminAuth(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).send({ error: "Missing authorization token" });
    }

    // Verify token
    const decoded = await admin.auth().verifyIdToken(token);

    // Check admin role
    if (decoded.role !== "admin") {
      return res.status(403).send({ error: "Access denied: Admins only" });
    }

    req.user = decoded; // store user data
    next();

  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(401).send({ error: "Invalid or expired token" });
  }
};

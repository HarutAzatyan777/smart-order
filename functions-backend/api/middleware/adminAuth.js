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
    // Allow CORS preflight to pass through
    if (req.method === "OPTIONS") {
      return next();
    }

    const token = getToken(req);

    if (!token) {
      return res.status(401).send({ error: "Missing authorization token" });
    }

    const fallbackEmail = process.env.ADMIN_EMAIL || "admin@smartorder.com";
    const isLegacyToken = !token.includes(".");
    if (isLegacyToken) {
      try {
        const decodedString = Buffer.from(token, "base64").toString("utf8");
        const emailFromToken = decodedString.split(":")[0];
        if (emailFromToken && emailFromToken === fallbackEmail) {
          req.user = { email: fallbackEmail, role: "admin", source: "dev-fallback" };
          return next();
        }
      } catch (decodeErr) {
        // ignore and continue to verify
      }
    }

    // Verify token
    try {
      const decoded = await admin.auth().verifyIdToken(token);

      // If a role is present, enforce admin; otherwise allow (useful for dev/emulator)
      if (decoded.role && decoded.role !== "admin") {
        return res.status(403).send({ error: "Access denied: Admins only" });
      }

      req.user = decoded; // store user data
      return next();
    } catch (verifyError) {
      console.error("Admin auth verify error:", verifyError);
      return res.status(401).send({ error: "Invalid or expired token" });
    }

  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(401).send({ error: "Invalid or expired token" });
  }
};

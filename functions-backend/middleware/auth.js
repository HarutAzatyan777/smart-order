const { admin } = require('../config/firebase');


// Usage: auth(required = true, requireAdmin = false)
module.exports = (required = true, requireAdmin = false) => async (req, res, next) => {
try {
const header = req.headers.authorization || '';
const token = header.startsWith('Bearer ') ? header.split('Bearer ')[1] : null;


if (!token) {
if (required) return res.status(401).json({ error: 'No token provided' });
req.user = null;
return next();
}


const decoded = await admin.auth().verifyIdToken(token);
req.user = decoded;


if (requireAdmin) {
// check custom claim 'admin' (set via admin SDK elsewhere)
if (!decoded.admin) {
return res.status(403).json({ error: 'Admin privileges required' });
}
}


next();
} catch (err) {
// invalid token
return res.status(401).json({ error: 'Invalid or expired token' });
}
};
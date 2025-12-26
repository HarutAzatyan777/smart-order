/**
 * Standardized error response helper for admin APIs.
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {object} [options]
 * @param {string} [options.code]
 * @param {object} [options.details]
 */
function sendError(res, status, message, options = {}) {
  const payload = {
    error: message,
    ...(options.code ? { code: options.code } : {}),
    ...(options.details ? { details: options.details } : {})
  };
  return res.status(status).json(payload);
}

module.exports = {
  sendError
};

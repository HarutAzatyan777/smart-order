const logger = require('./logger');


module.exports = (err, req, res, next) => {
// normalize error
const status = err.statusCode || err.status || 500;
const message = err.message || 'Internal Server Error';


logger.error('Error: %s %s', message, err.stack ? '\n' + err.stack : '');


res.status(status).json({
success: false,
error: {
message,
// expose details in non-production for easier debugging
...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
}
});
};
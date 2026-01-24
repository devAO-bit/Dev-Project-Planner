const morgan = require('morgan');
const logger = require('../config/logger');

// Add request-id token
morgan.token('request-id', (req) => req.id || '-');

// Dev format
const developmentFormat =
    ':method :url :status :response-time ms - :res[content-length] - req::request-id';

// Prod format
const productionFormat =
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" ' +
    ':status :res[content-length] ":referrer" ":user-agent" ' +
    ':response-time ms req::request-id';

const format =
    process.env.NODE_ENV === 'production'
        ? productionFormat
        : developmentFormat;

module.exports = morgan(format, {
    stream: logger.stream,
    skip: (req) => req.url === '/health',
});

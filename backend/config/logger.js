const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';

// Console format (human-readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(
        ({ timestamp, level, message }) =>
            `${timestamp} ${level}: ${message}`
    )
);

// File format (machine-readable)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Transports
const transports = [
    ...(isDev
        ? [
              new winston.transports.Console({
                  format: consoleFormat,
              }),
          ]
        : []),

    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
    }),

    new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: fileFormat,
    }),
];

// Create logger
const logger = winston.createLogger({
    level: isDev ? 'debug' : 'warn',
    levels,
    transports,
    exitOnError: false,
});

// Exception & rejection handling
logger.exceptions.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
        format: fileFormat,
    })
);

logger.rejections.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'rejections.log'),
        format: fileFormat,
    })
);

// Morgan integration
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger;

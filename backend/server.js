// server.js
require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./config/logger');
const validateEnv = require('./config/env.validator');

/**
 * Validate environment variables
 */
validateEnv();

/**
 * MongoDB connection with retry logic
 */
const connectDB = async () => {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                autoIndex: process.env.NODE_ENV !== 'production',
            });

            logger.info('✅ MongoDB connected successfully');
            return;
        } catch (error) {
            retries++;
            logger.error(
                `❌ MongoDB connection error (attempt ${retries}/${maxRetries})`,
                error
            );

            if (retries === maxRetries) {
                logger.error('❌ Failed to connect to MongoDB');
                process.exit(1);
            }

            await new Promise((resolve) =>
                setTimeout(resolve, Math.min(1000 * 2 ** retries, 10000))
            );
        }
    }
};

connectDB();

/**
 * MongoDB connection events
 */
mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('✅ MongoDB reconnected');
});

/**
 * Start HTTP server
 */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    logger.info(
        `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
    );
});

/**
 * Graceful shutdown (idempotent)
 */
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received. Shutting down gracefully...`);

    // Force shutdown after 10s
    const shutdownTimeout = setTimeout(() => {
        logger.error('⏱ Force shutdown after timeout');
        process.exit(1);
    }, 10000);

    try {
        await new Promise((resolve) => server.close(resolve));
        logger.info('HTTP server closed');

        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        clearTimeout(shutdownTimeout);
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Fatal error handlers
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', reason);
    process.exit(1);
});

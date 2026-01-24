// app.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

// Logger & security configs
const morganMiddleware = require('./middleware/morgan');
const {
    helmetConfig,
    additionalSecurityHeaders,
    getCorsOptions,
    getRateLimitConfig,
    requestIdMiddleware,
    responseTimeMiddleware,
} = require('./config/security');

// Routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const featureRoutes = require('./routes/feature.routes');
const taskRoutes = require('./routes/task.routes');

// Error handler
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();

/**
 * Trust proxy
 */
app.set('trust proxy', 1);

/**
 * Request tracking
 */
app.use(requestIdMiddleware);
// app.use(responseTimeMiddleware);

/**
 * HTTP logging
 */
app.use(morganMiddleware);

/**
 * Security middleware
 */
app.use(helmetConfig);
app.use(additionalSecurityHeaders);

/**
 * CORS
 */
app.use(cors(getCorsOptions()));

/**
 * Compression
 */
// app.use(compression());

/**
 * Body parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Mongo sanitize
 */
app.use(mongoSanitize());



/**
 * Rate limiting
 */
const apiLimiter = rateLimit(getRateLimitConfig());
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
    },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

/**
 * Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/tasks', taskRoutes);

/**
 * 404 handler
 */
app.use((req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.url}`);
    return res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

/**
 * Global error handler
 */
app.use(errorHandler);

module.exports = app;

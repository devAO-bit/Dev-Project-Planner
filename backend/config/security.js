const helmet = require('helmet');
const onHeaders = require('on-headers');

/**
 * Helmet configuration
 * - CSP disabled for APIs
 * - HSTS only in production
 */
const helmetConfig = helmet({
    contentSecurityPolicy: false, // APIs don't need CSP
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },

    ...(process.env.NODE_ENV === 'production' && {
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
    }),
});

/**
 * Additional security headers
 * (only what Helmet does NOT already handle)
 */
const additionalSecurityHeaders = (req, res, next) => {
    // Permissions Policy
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );

    // Disable caching for auth & user endpoints
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/user')) {
        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, private'
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    next();
};

/**
 * CORS configuration
 */
const getCorsOptions = () => {
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(origin => origin.trim());

    return {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Do NOT throw — prevents double responses
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        exposedHeaders: ['Content-Length', 'X-Request-Id', 'X-Response-Time'],
        optionsSuccessStatus: 200,
        maxAge: 600, // 10 minutes
    };
};

/**
 * Rate limit configuration
 */
const getRateLimitConfig = () => ({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    skip: (req) => {
        const trustedIPs = (process.env.TRUSTED_IPS || '')
            .split(',')
            .map(ip => ip.trim())
            .filter(Boolean);

        return trustedIPs.includes(req.ip);
    },
});

/**
 * Request ID middleware
 */
const requestIdMiddleware = (req, res, next) => {
    const requestId =
        req.headers['x-request-id'] ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
};

/**
 * Response time middleware (safe)
 */
const responseTimeMiddleware = (req, res, next) => {
    const start = Date.now();

    onHeaders(res, () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);
    });

    next();
};

module.exports = {
    helmetConfig,
    additionalSecurityHeaders,
    getCorsOptions,
    getRateLimitConfig,
    requestIdMiddleware,
    responseTimeMiddleware,
};

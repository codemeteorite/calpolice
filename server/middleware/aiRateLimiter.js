const rateLimit = require('express-rate-limit');

const defaultWindowMs = 15 * 60 * 1000;
const defaultMaxRequests = 8;

const getKey = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (req.user?.id) {
        return `user:${req.user.id}`;
    }

    if (token) {
        return `token:${token.slice(-12)}`;
    }

    return `ip:${req.ip}`;
};

const aiRateLimiter = rateLimit({
    windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || defaultWindowMs),
    max: Number(process.env.AI_RATE_LIMIT_MAX || defaultMaxRequests),
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    keyGenerator: getKey,
    message: {
        error: 'AI suggestions are temporarily rate-limited. Please wait a moment and try again.',
        retryAfter: Math.ceil((Number(process.env.AI_RATE_LIMIT_WINDOW_MS || defaultWindowMs)) / 1000),
        limit: Number(process.env.AI_RATE_LIMIT_MAX || defaultMaxRequests),
    },
    handler: (req, res) => {
        const retryAfter = Math.ceil((Number(process.env.AI_RATE_LIMIT_WINDOW_MS || defaultWindowMs)) / 1000);
        res.status(429).json({
            error: 'AI suggestions are temporarily rate-limited. Please wait a moment and try again.',
            message: 'AI suggestions are temporarily rate-limited. Please wait a moment and try again.',
            retryAfter,
            limit: Number(process.env.AI_RATE_LIMIT_MAX || defaultMaxRequests),
        });
    },
});

module.exports = aiRateLimiter;

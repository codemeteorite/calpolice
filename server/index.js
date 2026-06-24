const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Global rate limiter – max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// In production, restrict CORS to the deployed client URL
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/wellness', require('./routes/wellness'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'CalPolice API running 🚀' }));

const PORT = process.env.PORT || 5000;

const startServer = () => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('✅ MongoDB connected');
            startServer();
        })
        .catch(err => {
            console.error('⚠️ MongoDB connection failed, continuing without DB:', err.message);
            startServer();
        });
} else {
    console.warn('⚠️ MONGO_URI not set, starting server without MongoDB.');
    startServer();
}

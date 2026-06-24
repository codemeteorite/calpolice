const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

// ── Auth-specific rate limiter ─────────────────────────────────────────────
// Much tighter than the global limiter: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: 'Too many auth attempts, please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Simple input validator helper ─────────────────────────────────────────
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pwd) => typeof pwd === 'string' && pwd.length >= 6;

// POST /api/auth/signup  (rate-limited)
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const {
            name, email, password, age, height, weight,
            gender, heartConditions, goal, activityLevel, dietPreference
        } = req.body;

        // ── Input validation ──────────────────────────────────────────────
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(400).json({ message: 'Email already registered.' });

        const hashed = await bcrypt.hash(password, 10);

        const user = new User({
            name: name.trim(), email: email.toLowerCase().trim(),
            password: hashed, age, height, weight,
            gender, heartConditions: heartConditions || null,
            goal, activityLevel: activityLevel || 'moderate',
            dietPreference: dietPreference || 'both'
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                goal: user.goal,
                dailyCalorieTarget: user.dailyCalorieTarget,
                dietPreference: user.dietPreference
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

// POST /api/auth/login  (rate-limited)
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // ── Input validation ──────────────────────────────────────────────
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Same message for missing user vs wrong password – avoids user-enumeration
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                goal: user.goal,
                dailyCalorieTarget: user.dailyCalorieTarget,
                dietPreference: user.dietPreference
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// POST /api/auth/logout
// JWT is stateless – logout is handled client-side by discarding the token.
// This endpoint exists so the client has a consistent API to call, and so
// future server-side token-blacklisting logic can be added here.
router.post('/logout', (req, res) => {
    // Client should delete the token from localStorage / cookie after this call.
    res.json({ message: 'Logged out successfully. Please discard your token.' });
});

module.exports = router;


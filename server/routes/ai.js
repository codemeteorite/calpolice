const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimiter');
const axios = require('axios');

// POST /api/ai/analyze - Analyze a meal description via Python/Groq
router.post('/analyze', auth, aiRateLimiter, async (req, res) => {
    try {
        const { mealDescription, userProfile } = req.body;

        const response = await axios.post(
            `${process.env.PYTHON_AI_URL}/analyze`,
            { mealDescription, userProfile },
            { timeout: 35000 }
        );

        res.json(response.data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'AI service is not running. Start calpolice-ai/app.py to enable AI analysis.' });
        }
        if (err.response) {
            return res.status(err.response.status).json(err.response.data);
        }
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

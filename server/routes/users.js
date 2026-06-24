const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // never allow password update here
        delete updates.email;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        Object.assign(user, updates);
        await user.save(); // triggers BMR recalc

        res.json({ message: 'Profile updated', user: { ...user.toObject(), password: undefined } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

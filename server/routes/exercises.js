const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ExerciseLog = require('../models/ExerciseLog');

// Get today's exercise log
router.get('/today', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await ExerciseLog.find({
            user: req.user.id,
            date: { $gte: today }
        }).populate('exercises.exercise');

        const totalBurned = logs.reduce((sum, log) => sum + log.totalCaloriesBurned, 0);

        res.json({ logs, totalBurned });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Log an exercise performance
router.post('/', auth, async (req, res) => {
    try {
        const { exercises } = req.body; // array of exercise objects

        const newLog = new ExerciseLog({
            user: req.user.id,
            exercises
        });

        await newLog.save();
        res.status(201).json(newLog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete an exercise log
router.delete('/:id', auth, async (req, res) => {
    try {
        const log = await ExerciseLog.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!log) return res.status(404).json({ message: 'Log not found' });
        res.json({ message: 'Log deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

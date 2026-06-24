const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MealLog = require('../models/MealLog');
const ExerciseLog = require('../models/ExerciseLog');
const User = require('../models/User');

// GET /api/progress/weekly - Last 7 days calorie data for bar chart
router.get('/weekly', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const end = new Date(start.getTime() + 86400000);

            const meals = await MealLog.find({
                userId: req.user.id,
                date: { $gte: start, $lt: end }
            });

            const exercises = await ExerciseLog.find({
                user: req.user.id,
                date: { $gte: start, $lt: end }
            });

            const totalCal = meals.reduce((s, m) => s + m.totalCalories, 0);
            const totalBurned = exercises.reduce((s, e) => s + e.totalCaloriesBurned, 0);

            const totalPro = meals.reduce((s, m) => s + m.totalProtein, 0);
            const totalCarb = meals.reduce((s, m) => s + m.totalCarbs, 0);
            const totalFat = meals.reduce((s, m) => s + m.totalFat, 0);

            days.push({
                date: start.toISOString().split('T')[0],
                label: start.toLocaleDateString('en-US', { weekday: 'short' }),
                calories: totalCal,
                caloriesBurned: totalBurned,
                protein: Math.round(totalPro),
                carbs: Math.round(totalCarb),
                fat: Math.round(totalFat),
                target: user.dailyCalorieTarget
            });
        }

        res.json(days);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/progress/macros-today - Macro breakdown pie chart data
router.get('/macros-today', auth, async (req, res) => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start.getTime() + 86400000);

        const meals = await MealLog.find({
            userId: req.user.id,
            date: { $gte: start, $lt: end }
        });

        const protein = meals.reduce((s, m) => s + m.totalProtein, 0);
        const carbs = meals.reduce((s, m) => s + m.totalCarbs, 0);
        const fat = meals.reduce((s, m) => s + m.totalFat, 0);
        const totalCalories = meals.reduce((s, m) => s + m.totalCalories, 0);

        const user = await User.findById(req.user.id);

        const exercises = await ExerciseLog.find({
            user: req.user.id,
            date: { $gte: start, $lt: end }
        });
        const totalBurned = exercises.reduce((s, e) => s + e.totalCaloriesBurned, 0);

        res.json({
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fat: Math.round(fat),
            totalCalories: Math.round(totalCalories),
            burned: Math.round(totalBurned),
            target: user.dailyCalorieTarget,
            // Calculate remaining as: target - consumed + burned
            remaining: Math.max(0, user.dailyCalorieTarget - totalCalories + totalBurned)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/progress/macros-by-date?date=YYYY-MM-DD - Get macros for a specific date
router.get('/macros-by-date', auth, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'date parameter required (YYYY-MM-DD)' });
        }

        const [year, month, day] = date.split('-');
        const start = new Date(year, month - 1, day);
        const end = new Date(start.getTime() + 86400000);

        const meals = await MealLog.find({
            userId: req.user.id,
            date: { $gte: start, $lt: end }
        });

        const protein = meals.reduce((s, m) => s + m.totalProtein, 0);
        const carbs = meals.reduce((s, m) => s + m.totalCarbs, 0);
        const fat = meals.reduce((s, m) => s + m.totalFat, 0);
        const totalCalories = meals.reduce((s, m) => s + m.totalCalories, 0);

        const user = await User.findById(req.user.id);

        const exercises = await ExerciseLog.find({
            user: req.user.id,
            date: { $gte: start, $lt: end }
        });
        const totalBurned = exercises.reduce((s, e) => s + e.totalCaloriesBurned, 0);

        res.json({
            date,
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fat: Math.round(fat),
            totalCalories: Math.round(totalCalories),
            burned: Math.round(totalBurned),
            target: user.dailyCalorieTarget,
            remaining: Math.max(0, user.dailyCalorieTarget - totalCalories + totalBurned),
            meals
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

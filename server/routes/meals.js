const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MealLog = require('../models/MealLog');

// POST /api/meals - Log a meal
router.post('/', auth, async (req, res) => {
    try {
        const { mealType, foods, notes, date } = req.body;

        const meal = new MealLog({
            userId: req.user.id,
            mealType,
            foods,
            notes: notes || '',
            date: date ? new Date(date) : new Date()
        });

        await meal.save();
        res.status(201).json(meal);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/meals - Get meals for the user, optionally filtered by date
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filter = { userId: req.user.id };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const meals = await MealLog.find(filter).sort({ date: -1 });
        res.json(meals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/meals/today - Get today's meals
router.get('/today', auth, async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const meals = await MealLog.find({
            userId: req.user.id,
            date: { $gte: startOfDay, $lt: endOfDay }
        }).sort({ date: 1 });

        const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
        const totalProtein = meals.reduce((sum, m) => sum + m.totalProtein, 0);
        const totalCarbs = meals.reduce((sum, m) => sum + m.totalCarbs, 0);
        const totalFat = meals.reduce((sum, m) => sum + m.totalFat, 0);

        res.json({ meals, totalCalories, totalProtein, totalCarbs, totalFat });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/meals/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const meal = await MealLog.findOne({ _id: req.params.id, userId: req.user.id });
        if (!meal) return res.status(404).json({ message: 'Meal not found' });

        await meal.deleteOne();
        res.json({ message: 'Meal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

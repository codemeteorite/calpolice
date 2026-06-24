const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FoodItem = require('../models/FoodItem');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const WaterLog = require('../models/WaterLog');
const WellnessLog = require('../models/WellnessLog');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// GET /api/recommendations/food
router.get('/food', auth, async (req, res) => {
    try {
        console.log('[RECS FOOD] Request from user:', req.user.id);
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('[RECS FOOD] User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        
        const goal = req.query.goal || user.goal;
        const isVeg = req.query.isVeg !== undefined
            ? req.query.isVeg === 'true'
            : user.dietPreference === 'veg';

        console.log('[RECS FOOD] Goal:', goal, 'IsVeg:', isVeg);

        const filter = { suitableFor: goal };
        if (req.query.isVeg !== undefined || user.dietPreference !== 'both') {
            filter.isVeg = isVeg;
        }

        const dbFoods = await FoodItem.find(filter).limit(20);
        console.log('[RECS FOOD] Found DB foods:', dbFoods.length);

        // Also fetch AI-enhanced suggestions from Python
        let aiSuggestions = [];
        if (req.query.skipAi !== 'true') {
            try {
                // Get today's wellness context
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const end = new Date(start.getTime() + 86400000);

                const [waterLogs, wellnessLog] = await Promise.all([
                    WaterLog.find({ user: req.user.id, date: { $gte: start, $lt: end } }),
                    WellnessLog.findOne({ user: req.user.id, date: { $gte: start, $lt: end } }).sort({ date: -1 })
                ]);

                const totalWaterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
                console.log('[RECS FOOD] Water intake:', totalWaterMl);

                console.log('[RECS FOOD] Calling AI at:', AI_SERVICE_URL);
                const excludeStr = req.query.exclude || '';
                const excludeList = excludeStr ? excludeStr.split(',').map(s => s.trim()) : [];

                const aiRes = await axios.post(`${AI_SERVICE_URL}/suggest-foods`, {
                    goal,
                    isVeg: isVeg,
                    recentMeals: excludeList,
                    wellness: {
                        totalWaterMl,
                        stressLevel: wellnessLog ? wellnessLog.stressLevel : 0
                    }
                }, { timeout: 8000 });
                
                // Force the boolean to match the requested category so the UI sorting never breaks
                const safeSuggestions = (aiRes.data.suggestions || []).map(item => {
                    item.isVeg = isVeg;
                    return item;
                });

                console.log('[RECS FOOD] AI Response:', aiRes.data);
                return res.json({
                    foods: dbFoods,
                    aiSuggestions: safeSuggestions,
                    wellnessAdvice: aiRes.data.wellnessAdvice || ''
                });
            } catch (e) {
                // AI service may not be running, gracefully skip
                console.error('[RECS FOOD] AI Error:', e.message);
            }
        }

        console.log('[RECS FOOD] Returning DB foods only:', dbFoods.length);
        res.json({ foods: dbFoods, aiSuggestions: [], wellnessAdvice: '' });
    } catch (err) {
        console.error('[RECS FOOD] Endpoint error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/recommendations/exercise
router.get('/exercise', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const goal = req.query.goal || user.goal;
        const { category, skipAi } = req.query;

        const filterQuery = { targetGoals: goal };
        if (category && category !== 'all') {
            filterQuery.category = { $regex: new RegExp(category, 'i') };
        }

        const dbExercises = await Exercise.find(filterQuery);

        // Fetch AI-enhanced exercise suggestions
        let aiExercises = [];
        if (skipAi !== 'true') {
            try {
                // Get today's wellness context
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const end = new Date(start.getTime() + 86400000);

                const [waterLogs, wellnessLog] = await Promise.all([
                    WaterLog.find({ user: req.user.id, date: { $gte: start, $lt: end } }),
                    WellnessLog.findOne({ user: req.user.id, date: { $gte: start, $lt: end } }).sort({ date: -1 })
                ]);

                const totalWaterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);

                const excludeStr = req.query.exclude || '';
                const excludeList = excludeStr ? excludeStr.split(',').map(s => s.trim()) : [];

                const aiRes = await axios.post(`${AI_SERVICE_URL}/suggest-exercises`, {
                    goal: user.goal,
                    category: category === 'all' ? '' : category,
                    recentExercises: excludeList,
                    wellness: {
                        totalWaterMl,
                        stressLevel: wellnessLog ? wellnessLog.stressLevel : 0
                    }
                }, { timeout: 10000 });

                // Format AI exercises to match DB schema so frontend can render them seamlessly
                if (aiRes.data && aiRes.data.suggestions) {
                    aiExercises = aiRes.data.suggestions.map((ex, i) => ({
                        _id: `ai-ex-${Date.now()}-${i}`,
                        name: `✨ AI: ${ex.name}`,
                        category: (category && category !== 'all') ? category : (ex.category || 'cardio'),
                        description: ex.description || 'AI Recommended Exercise',
                        duration: ex.duration || '15',
                        caloriesBurnedPerHour: ex.caloriesBurnedPerHour || 300,
                        suggestedSets: ex.suggestedSets,
                        suggestedReps: ex.suggestedReps,
                        restBetweenSets: ex.restBetweenSets,
                        difficulty: ex.difficulty || 'intermediate',
                        youtubeVideoId: ex.youtubeVideoId || 'vwALXgok6YI', // fallback
                        targetGoals: [goal]
                    }));
                }
            } catch (e) {
                console.error('Failed to get AI exercises:', e.message);
            }
        }

        // Return combined list, AI first
        res.json([...aiExercises, ...dbExercises]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

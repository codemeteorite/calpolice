const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimiter');
const FoodItem = require('../models/FoodItem');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const DailyRecommendation = require('../models/DailyRecommendation');
const WaterLog = require('../models/WaterLog');
const WellnessLog = require('../models/WellnessLog');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_REQUEST_TIMEOUT_MS = 35000;

const normalizeRecommendationName = (value) => String(value || '').trim().toLowerCase();

const getDateKey = (dateValue = new Date()) => {
    const date = new Date(dateValue);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getSafeFoodObject = (item) => {
    const record = item && typeof item.toObject === 'function' ? item.toObject() : { ...item };
    return {
        ...record,
        name: record.name || 'Meal suggestion',
        calories: Number(record.calories) || 300,
        protein: Number(record.protein) || 0,
        carbs: Number(record.carbs) || 0,
        fat: Number(record.fat) || 0,
        portionSize: record.portionSize || '1 serving',
        isVeg: typeof record.isVeg === 'boolean' ? record.isVeg : true,
    };
};

const getSafeExerciseObject = (item) => {
    const record = item && typeof item.toObject === 'function' ? item.toObject() : { ...item };
    const safeVideoId = typeof record.youtubeVideoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(record.youtubeVideoId.trim()) && record.youtubeVideoId.trim() !== 'dQw4w9WgXcQ'
        ? record.youtubeVideoId.trim()
        : '';

    return {
        ...record,
        _id: record._id || `ai-ex-${Date.now()}`,
        name: record.name || 'Exercise suggestion',
        category: record.category || 'cardio',
        description: record.description || 'Recommended Exercise',
        duration: record.duration || '15',
        caloriesBurnedPerHour: Number(record.caloriesBurnedPerHour) || 300,
        suggestedSets: record.suggestedSets || 3,
        suggestedReps: record.suggestedReps || '10-12',
        restBetweenSets: record.restBetweenSets || '60s',
        difficulty: record.difficulty || 'intermediate',
        youtubeVideoId: safeVideoId,
        targetGoals: Array.isArray(record.targetGoals) ? record.targetGoals : [],
    };
};

const pickDailyFood = async (user, requestedIsVeg) => {
    const preferredVeg = typeof requestedIsVeg === 'boolean'
        ? requestedIsVeg
        : user.dietPreference === 'veg'
            ? true
            : user.dietPreference === 'non_veg'
                ? false
                : null;

    const query = { suitableFor: user.goal || 'maintain' };
    if (preferredVeg !== null) {
        query.isVeg = preferredVeg;
    }

    let foodItems = await FoodItem.find(query).lean();
    if (!foodItems.length && preferredVeg !== null) {
        foodItems = await FoodItem.find({ suitableFor: user.goal || 'maintain' }).lean();
    }
    if (!foodItems.length) {
        foodItems = await FoodItem.find().lean();
    }

    if (!foodItems.length) {
        return null;
    }

    foodItems.sort((a, b) => {
        const aScore = (a.suitableFor || []).includes(user.goal || 'maintain') ? 1 : 0;
        const bScore = (b.suitableFor || []).includes(user.goal || 'maintain') ? 1 : 0;
        if (aScore !== bScore) {
            return bScore - aScore;
        }
        return (b.protein || 0) - (a.protein || 0);
    });

    return getSafeFoodObject(foodItems[0]);
};

const pickDailyExercise = async (user, categoryPreference) => {
    const goal = user.goal || 'maintain';
    const baseFilter = { targetGoals: goal };
    if (categoryPreference && categoryPreference !== 'all') {
        baseFilter.category = { $regex: new RegExp(categoryPreference, 'i') };
    }

    let exercises = await Exercise.find(baseFilter).lean();
    if (!exercises.length) {
        exercises = await Exercise.find({ targetGoals: goal }).lean();
    }
    if (!exercises.length) {
        exercises = await Exercise.find().lean();
    }

    if (!exercises.length) {
        return null;
    }

    exercises = exercises.filter(ex => {
        const name = (ex.name || '').toLowerCase();
        const videoId = (ex.youtubeVideoId || '');
        return !name.includes('brisk walking') && !name.includes('rick roll') && videoId !== 'dQw4w9WgXcQ';
    });

    if (!exercises.length) {
        return null;
    }

    exercises.sort((a, b) => {
        const aScore = (a.targetGoals || []).includes(goal) ? 1 : 0;
        const bScore = (b.targetGoals || []).includes(goal) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return Number(b.caloriesBurnedPerHour || 0) - Number(a.caloriesBurnedPerHour || 0);
    });

    return getSafeExerciseObject(exercises[0]);
};

const buildFallbackExerciseSuggestions = (goal, category) => {
    const goalKey = String(goal || '').toLowerCase();
    const base = [
        { name: 'Bodyweight Squats', category: 'strength', description: 'Build lower-body strength with a simple, scalable movement.', duration: '15', caloriesBurnedPerHour: 320, suggestedSets: 3, suggestedReps: '12-15', restBetweenSets: '45s', difficulty: 'beginner', youtubeVideoId: '', context: 'Solid strength work for a balanced routine.' },
        { name: 'Power Walk Intervals', category: 'cardio', description: 'Alternates brisk walking with recovery to raise heart rate without overloading the joints.', duration: '20', caloriesBurnedPerHour: 280, suggestedSets: 1, suggestedReps: '20-30 min', restBetweenSets: '0s', difficulty: 'beginner', youtubeVideoId: '', context: 'Great for steady cardio and stress relief.' },
        { name: 'Yoga Flow', category: 'flexibility', description: 'Improves mobility and recovery after work or training sessions.', duration: '15', caloriesBurnedPerHour: 180, suggestedSets: 1, suggestedReps: '15 min', restBetweenSets: '0s', difficulty: 'beginner', youtubeVideoId: '', context: 'Useful for cooldown and recovery when stress is elevated.' },
        { name: 'Dumbbell Press', category: 'strength', description: 'Helps build pressing strength and upper-body power with controlled reps.', duration: '15', caloriesBurnedPerHour: 350, suggestedSets: 3, suggestedReps: '8-12', restBetweenSets: '60s', difficulty: 'intermediate', youtubeVideoId: '', context: 'A strong choice for progressive strength and muscle retention.' }
    ];

    if (category && category !== 'all') {
        base.forEach(item => {
            item.category = category;
        });
    }

    if (goalKey.includes('lose')) {
        base.forEach(item => {
            item.context = 'Keeps your plan effective without excessive fatigue.';
        });
    } else if (goalKey.includes('gain')) {
        base.forEach(item => {
            item.context = 'Supports stronger training quality and muscle-building consistency.';
        });
    }

    return base.map((ex, index) => ({
        _id: `ai-ex-fallback-${Date.now()}-${index}`,
        ...ex,
        targetGoals: [goal],
        difficulty: ex.difficulty || 'beginner'
    }));
};

// GET /api/recommendations/food
router.get('/food', auth, aiRateLimiter, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const goal = req.query.goal || user.goal;
        const isVeg = req.query.isVeg !== undefined ? req.query.isVeg === 'true' : user.dietPreference === 'veg';

        const filter = { suitableFor: goal };
        if (req.query.isVeg !== undefined || user.dietPreference !== 'both') {
            filter.isVeg = isVeg;
        }

        const dbFoods = (await FoodItem.find(filter).limit(20)).map(getSafeFoodObject);
        return res.json({ foods: dbFoods, aiSuggestions: [], wellnessAdvice: '', fallback: false });
    } catch (err) {
        console.error('[RECS FOOD] Endpoint error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

router.post('/food/ai', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const goal = req.body.goal || user.goal || 'maintain';
        const isVeg = typeof req.body.isVeg === 'boolean' ? req.body.isVeg : user.dietPreference === 'veg';
        const recentMeals = Array.isArray(req.body.recentMeals) ? req.body.recentMeals : [];
        const excludeList = Array.from(new Set(recentMeals.map(item => normalizeRecommendationName(item)).filter(Boolean)));

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 86400000);

        const [waterLogs, wellnessLog] = await Promise.all([
            WaterLog.find({ user: req.user.id, date: { $gte: start, $lt: end } }),
            WellnessLog.findOne({ user: req.user.id, date: { $gte: start, $lt: end } }).sort({ date: -1 }),
        ]);

        const totalWaterMl = waterLogs.reduce((sum, log) => sum + (Number(log.amountMl) || 0), 0);
        const aiRes = await axios.post(`${AI_SERVICE_URL}/suggest-foods`, {
            goal,
            isVeg,
            recentMeals: excludeList,
            wellness: {
                totalWaterMl,
                stressLevel: wellnessLog ? wellnessLog.stressLevel : 0,
            },
        }, { timeout: AI_REQUEST_TIMEOUT_MS });

        const safeSuggestions = (aiRes.data.suggestions || []).map(item => ({
            ...item,
            isVeg: typeof item.isVeg === 'boolean' ? item.isVeg : isVeg,
            name: item.name || 'Meal suggestion',
            portionSize: item.portionSize || '1 serving',
            calories: Number(item.calories) || 300,
            protein: Number(item.protein) || 0,
            carbs: Number(item.carbs) || 0,
            fat: Number(item.fat) || 0,
        }));

        return res.json({
            suggestions: safeSuggestions,
            wellnessAdvice: aiRes.data.wellnessAdvice || '',
            fallback: Boolean(aiRes.data && aiRes.data.fallback),
        });
    } catch (e) {
        const status = e?.response?.status || (e?.code === 'ECONNABORTED' ? 504 : 500);
        if (status === 429 || e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '')) {
            const retryAfter = Number(e?.response?.data?.retryAfter || e?.response?.headers?.['retry-after'] || 30);
            return res.status(status).json({
                message: 'AI food suggestions timed out or are rate-limited.',
                retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30,
                fallback: false,
            });
        }

        if (e?.response?.data && e?.response?.data?.fallback) {
            return res.status(200).json({
                suggestions: Array.isArray(e.response.data.suggestions) ? e.response.data.suggestions : [],
                wellnessAdvice: e.response.data.wellnessAdvice || '',
                fallback: true,
            });
        }

        console.error('[RECS FOOD AI] Error:', e.message || e.code || 'unknown');
        return res.status(500).json({ message: e.message || 'Failed to generate food suggestions.' });
    }
});

// GET /api/recommendations/exercise
router.get('/exercise', auth, aiRateLimiter, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const goal = req.query.goal || user.goal;
        const category = req.query.category || 'all';

        const filterQuery = { targetGoals: goal };
        if (category && category !== 'all') {
            filterQuery.category = { $regex: new RegExp(category, 'i') };
        }

        const dbExercises = (await Exercise.find(filterQuery)).filter(ex => {
            const name = (ex.name || '').toLowerCase();
            const videoId = (ex.youtubeVideoId || '');
            return !name.includes('brisk walking') && !name.includes('rick roll') && videoId !== 'dQw4w9WgXcQ';
        }).map(getSafeExerciseObject);

        return res.json(dbExercises);
    } catch (err) {
        console.error('[RECS EXERCISE] Endpoint error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

router.post('/exercise/ai', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const goal = req.body.goal || user.goal || 'maintain';
        const category = req.body.category || '';
        const recentExercises = Array.isArray(req.body.recentExercises) ? req.body.recentExercises : [];
        const excludeList = recentExercises.map(item => String(item).trim()).filter(Boolean);

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 86400000);

        const [waterLogs, wellnessLog] = await Promise.all([
            WaterLog.find({ user: req.user.id, date: { $gte: start, $lt: end } }),
            WellnessLog.findOne({ user: req.user.id, date: { $gte: start, $lt: end } }).sort({ date: -1 }),
        ]);

        const totalWaterMl = waterLogs.reduce((sum, log) => sum + (Number(log.amountMl) || 0), 0);
        const aiRes = await axios.post(`${AI_SERVICE_URL}/suggest-exercises`, {
            goal,
            category,
            recentExercises: excludeList,
            wellness: {
                totalWaterMl,
                stressLevel: wellnessLog ? wellnessLog.stressLevel : 0,
            },
        }, { timeout: AI_REQUEST_TIMEOUT_MS });

        const suggestions = (aiRes.data.suggestions || []).map((ex, i) => ({
            ...ex,
            _id: `ai-ex-${Date.now()}-${i}`,
            category: ex.category || (category && category !== 'all' ? category : 'cardio'),
            description: ex.description || 'Recommended Exercise',
            duration: ex.duration || '15',
            caloriesBurnedPerHour: Number(ex.caloriesBurnedPerHour) || 300,
            suggestedSets: ex.suggestedSets || 3,
            suggestedReps: ex.suggestedReps || '10-12',
            restBetweenSets: ex.restBetweenSets || '60s',
            difficulty: ex.difficulty || 'intermediate',
            youtubeVideoId: /^[A-Za-z0-9_-]{11}$/.test(String(ex.youtubeVideoId || '')) && String(ex.youtubeVideoId).trim() !== 'dQw4w9WgXcQ'
                ? String(ex.youtubeVideoId).trim()
                : '',
            targetGoals: [goal],
        }));

        return res.json({
            suggestions,
            fallback: Boolean(aiRes.data && aiRes.data.fallback),
        });
    } catch (e) {
        const status = e?.response?.status || (e?.code === 'ECONNABORTED' ? 504 : 500);
        if (status === 429 || e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '')) {
            const retryAfter = Number(e?.response?.data?.retryAfter || e?.response?.headers?.['retry-after'] || 30);
            return res.status(status).json({
                message: 'AI exercise suggestions timed out or are rate-limited.',
                retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30,
                fallback: false,
            });
        }

        console.error('[RECS EXERCISE AI] Error:', e.message || e.code || 'unknown');
        return res.status(500).json({ message: e.message || 'Failed to generate exercise suggestions.' });
    }
});

router.get('/daily', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const type = req.query.type === 'exercise' ? 'exercise' : 'food';
        const dateKey = getDateKey(req.query.dateKey || new Date());
        const requestedIsVeg = req.query.isVeg !== undefined ? req.query.isVeg === 'true' : undefined;
        const categoryPreference = String(req.query.category || 'all');

        const query = { user: user._id, type, dateKey };
        if (type === 'food') {
            query.isVeg = requestedIsVeg !== undefined ? requestedIsVeg : user.dietPreference === 'veg';
        } else {
            query.category = categoryPreference;
        }

        let existing = await DailyRecommendation.findOne(query).lean();
        if (existing && existing.recommendation) {
            return res.json({ type, dateKey, pick: existing.recommendation, isVeg: existing.isVeg, category: existing.category });
        }

        const pick = type === 'food'
            ? await pickDailyFood(user, requestedIsVeg)
            : await pickDailyExercise(user, categoryPreference);

        if (!pick) {
            return res.json({ type, dateKey, pick: null, isVeg: requestedIsVeg, category: categoryPreference });
        }

        const doc = await DailyRecommendation.findOneAndUpdate(
            query,
            {
                $setOnInsert: {
                    user: user._id,
                    type,
                    dateKey,
                    isVeg: type === 'food' ? (requestedIsVeg !== undefined ? requestedIsVeg : user.dietPreference === 'veg') : undefined,
                    category: type === 'exercise' ? categoryPreference : 'all',
                    recommendation: pick,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ type, dateKey, pick: doc?.recommendation || pick, isVeg: doc?.isVeg ?? requestedIsVeg, category: doc?.category ?? categoryPreference });
    } catch (err) {
        console.error('[RECS DAILY] Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

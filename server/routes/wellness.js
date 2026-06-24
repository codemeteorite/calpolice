const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const WaterLog = require('../models/WaterLog');
const WellnessLog = require('../models/WellnessLog');

// GET /api/wellness/today
router.get('/today', auth, async (req, res) => {
    try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 86400000);

        console.log(`[WATER] Fetching water for user ${req.user.id} between ${start} and ${end}`);

        const [waterLogs, wellnessLog] = await Promise.all([
            WaterLog.find({
                user: req.user.id,
                date: { $gte: start, $lt: end }
            }),
            WellnessLog.findOne({
                user: req.user.id,
                date: { $gte: start, $lt: end }
            }).sort({ date: -1 })
        ]);

        const totalWaterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
        
        console.log(`[WATER] Found ${waterLogs.length} logs, total: ${totalWaterMl}ml`);

        res.json({
            totalWaterMl,
            stressLevel: wellnessLog ? wellnessLog.stressLevel : 0,
            cortisolSymptoms: wellnessLog ? wellnessLog.cortisolSymptoms : [],
            notes: wellnessLog ? wellnessLog.notes : ''
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/wellness/water
router.post('/water', auth, async (req, res) => {
    try {
        const { amountMl } = req.body;
        
        console.log(`[WATER POST] User: ${req.user.id}, Amount: ${amountMl}ml, Date: ${new Date()}`);
        
        // Validate input
        if (amountMl === undefined || amountMl === null) {
            return res.status(400).json({ message: 'amountMl is required' });
        }
        
        if (typeof amountMl !== 'number') {
            return res.status(400).json({ message: 'amountMl must be a number' });
        }

        if (!req.user.id) {
            console.error('[WATER POST] No user ID in token');
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const newLog = new WaterLog({
            user: req.user.id,
            amountMl
        });
        await newLog.save();
        
        console.log(`[WATER POST] Saved water log: ${newLog._id}`);
        
        res.status(201).json(newLog);
    } catch (err) {
        console.error(`[WATER POST] Error:`, err.message);
        console.error(`[WATER POST] Error details:`, err);
        res.status(400).json({ message: err.message });
    }
});

// GET /api/wellness/water-by-date?date=YYYY-MM-DD - Get water logs for specific date
router.get('/water-by-date', auth, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'date parameter required (YYYY-MM-DD)' });
        }

        const [year, month, day] = date.split('-');
        const start = new Date(year, month - 1, day);
        const end = new Date(start.getTime() + 86400000);

        const waterLogs = await WaterLog.find({
            user: req.user.id,
            date: { $gte: start, $lt: end }
        });

        const totalWaterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
        const waterTarget = 2500;

        res.json({
            date,
            totalWaterMl,
            waterTarget,
            logs: waterLogs
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/wellness/stress
router.post('/stress', auth, async (req, res) => {
    try {
        const { stressLevel, notes, cortisolSymptoms } = req.body;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 86400000);

        // Find today's log to update, or create new
        let log = await WellnessLog.findOne({
            user: req.user.id,
            date: { $gte: start, $lt: end }
        });

        if (log) {
            log.stressLevel = stressLevel;
            log.notes = notes || log.notes;
            log.cortisolSymptoms = cortisolSymptoms || log.cortisolSymptoms;
            await log.save();
        } else {
            log = new WellnessLog({
                user: req.user.id,
                stressLevel,
                notes,
                cortisolSymptoms
            });
            await log.save();
        }
        res.json(log);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;

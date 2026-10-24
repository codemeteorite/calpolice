const mongoose = require('mongoose');

const dailyRecommendationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['food', 'exercise'],
        required: true,
        index: true,
    },
    dateKey: {
        type: String,
        required: true,
        index: true,
    },
    isVeg: {
        type: Boolean,
        default: null,
    },
    category: {
        type: String,
        default: 'all',
    },
    recommendation: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

dailyRecommendationSchema.index({ user: 1, type: 1, dateKey: 1, isVeg: 1, category: 1 }, { unique: true });

dailyRecommendationSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('DailyRecommendation', dailyRecommendationSchema);

const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: {
        type: String,
        enum: ['cardio', 'strength', 'yoga', 'hiit', 'flexibility', 'sports'],
        required: true
    },
    caloriesBurnedPerHour: { type: Number, required: true },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    youtubeVideoId: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: String, default: '30 minutes' },

    // Structured Plan (Sets/Reps)
    suggestedSets: { type: Number, default: 3 },
    suggestedReps: { type: String, default: '10-12' },
    restBetweenSets: { type: String, default: '60s' },

    targetGoals: [{ type: String }], // ['lose_weight', 'gain_weight', 'maintain']
    muscleGroups: [{ type: String }]
});

module.exports = mongoose.model('Exercise', exerciseSchema);

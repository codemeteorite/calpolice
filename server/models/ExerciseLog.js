const mongoose = require('mongoose');

const exerciseLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    exercises: [{
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
        name: { type: String, required: true }, // Store name fallback in case reference is deleted or custom
        category: { type: String }, // 'cardio', 'strength', etc.
        durationMinutes: { type: Number, required: true },
        caloriesBurned: { type: Number, required: true }, // Calculated or manual
        // Structured plan properties
        sets: { type: Number },
        reps: { type: Number },
        weight: { type: Number } // For strength training
    }],
    totalCaloriesBurned: { type: Number, default: 0 }
});

// Calculate total calories burned before saving
exerciseLogSchema.pre('save', function (next) {
    this.totalCaloriesBurned = this.exercises.reduce((total, ex) => total + ex.caloriesBurned, 0);
    next();
});

module.exports = mongoose.model('ExerciseLog', exerciseLogSchema);

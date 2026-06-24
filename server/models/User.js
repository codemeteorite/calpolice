const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, required: true },
    height: { type: Number, required: true }, // cm
    weight: { type: Number, required: true }, // kg
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    heartConditions: { type: String, default: null },
    goal: {
        type: String,
        enum: ['lose_weight', 'gain_weight', 'maintain'],
        required: true
    },
    activityLevel: {
        type: String,
        enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
        default: 'moderate'
    },
    dietPreference: {
        type: String,
        enum: ['veg', 'non_veg', 'both'],
        default: 'both'
    },
    favoriteMeals: {
        type: Array,
        default: []
    },
    dailyCalorieTarget: { type: Number, default: 2000 },
    createdAt: { type: Date, default: Date.now }
});

// Auto-calculate daily calorie target using Mifflin-St Jeor equation
userSchema.pre('save', function (next) {
    // If we're missing physical stats, skip calculation to avoid NaN
    if (!this.weight || !this.height || !this.age) {
        return next();
    }

    let bmr;
    if (this.gender === 'male') {
        bmr = 10 * this.weight + 6.25 * this.height - 5 * this.age + 5;
    } else {
        // female or other
        bmr = 10 * this.weight + 6.25 * this.height - 5 * this.age - 161;
    }

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };

    let tdee = bmr * (activityMultipliers[this.activityLevel] || 1.55);

    if (this.goal === 'lose_weight') tdee -= 500;
    else if (this.goal === 'gain_weight') tdee += 500;

    // Final safety check for NaN
    if (!isNaN(tdee)) {
        this.dailyCalorieTarget = Math.round(tdee);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);

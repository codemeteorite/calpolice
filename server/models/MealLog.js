const mongoose = require('mongoose');

const mealLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: true
    },
    foods: [
        {
            name: { type: String, required: true },
            calories: { type: Number, required: true },
            protein: { type: Number, default: 0 },
            carbs: { type: Number, default: 0 },
            fat: { type: Number, default: 0 },
            isVeg: { type: Boolean, default: true },
            portionSize: { type: String, default: '1 serving' }
        }
    ],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Auto-calculate totals
mealLogSchema.pre('save', function (next) {
    this.totalCalories = this.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.totalProtein = this.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
    this.totalCarbs = this.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    this.totalFat = this.foods.reduce((sum, f) => sum + (f.fat || 0), 0);
    next();
});

module.exports = mongoose.model('MealLog', mealLogSchema);

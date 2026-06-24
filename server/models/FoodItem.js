const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    calories: { type: Number, required: true }, // per 100g
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    isVeg: { type: Boolean, default: true },
    category: {
        type: String,
        enum: ['grain', 'protein', 'dairy', 'fruit', 'vegetable', 'legume', 'nuts', 'beverage', 'snack'],
        required: true
    },
    portionSize: { type: String, default: '100g' },
    tags: [{ type: String }], // e.g. ['high-protein', 'low-carb', 'iron-rich']
    suitableFor: [{ type: String }] // ['lose_weight', 'gain_weight', 'maintain']
});

module.exports = mongoose.model('FoodItem', foodItemSchema);

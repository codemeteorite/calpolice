const mongoose = require('mongoose');

const waterLogSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Invalid user ID'
        }
    },
    date: { type: Date, default: Date.now },
    amountMl: { 
        type: Number, 
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'number' && !isNaN(v);
            },
            message: 'amountMl must be a valid number'
        }
    }
});

module.exports = mongoose.model('WaterLog', waterLogSchema);

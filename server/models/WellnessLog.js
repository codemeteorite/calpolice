const mongoose = require('mongoose');

const wellnessLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    stressLevel: { type: Number, min: 1, max: 10, required: true },
    notes: { type: String, default: '' },
    cortisolSymptoms: [{ type: String }] // ['low_energy', 'anxiety', 'poor_sleep', etc.]
});

module.exports = mongoose.model('WellnessLog', wellnessLogSchema);

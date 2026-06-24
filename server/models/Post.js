const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);

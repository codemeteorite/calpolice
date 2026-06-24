const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');

// GET /api/feed - Get all posts sorted by newest
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('user', 'name')
            .limit(50); // limit to recent 50 for simplicity
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/feed - Create a new post
router.post('/', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const newPost = new Post({
            user: req.user.id,
            content: content.trim()
        });

        await newPost.save();

        // Populate user name before returning
        await newPost.populate('user', 'name');

        res.status(201).json(newPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;

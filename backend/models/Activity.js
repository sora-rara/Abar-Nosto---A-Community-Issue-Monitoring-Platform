const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['new_issue', 'new_comment', 'status_update', 'upvote', 'downvote', 'upvote_removed', 'downvote_removed']
    },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    issueTitle: { type: String, required: true },
    issueCategory: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    content: { type: String },
    importance: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
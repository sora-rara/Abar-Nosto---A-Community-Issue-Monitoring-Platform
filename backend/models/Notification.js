const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // models/Notification.js
    type: {
        type: String,
        enum: [
            'followed_issue_update',
            'nearby_issue',
            'status_change',
            'new_comment',
            'upvote_received',
            'reopen_request',
            'issue_archived',      // ✅ existing
            'issue_reactivated',    // ✅ existing
            'reputation_change',   // ✅ added from second file
            'update_request'       // ✅ added from second file
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedIssue: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    read: { type: Boolean, default: false },
    metadata: {
        oldStatus: String,
        newStatus: String,
        commentId: mongoose.Schema.Types.ObjectId,
        distance: Number
    },
    createdAt: { type: Date, default: Date.now }
});

// TTL index: auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
// Compound index for user notification list
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
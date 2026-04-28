const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'new_issue',
            'new_comment',
            'status_update',
            'issue_resolved',
            'upvote',
            'downvote',
            'upvote_removed',      // ✅ ADD THIS
            'downvote_removed',    // ✅ ADD THIS
            'user_registered',
            'report_flagged',
            'bulk_action',
            'comment_moderated',
            'issue_prioritized',
            'user_warning',
            'system_alert'
        ]
    },
    issue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    issueTitle: {
        type: String
    },
    issueCategory: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userName: {
        type: String,
        required: true
    },
    content: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    flaggedReason: {
        type: String
    },
    analytics: {
        affectedUsers: {
            type: Number,
            default: 0
        },
        engagementScore: {
            type: Number,
            default: 0
        },
        responseTime: {
            type: Number, // in minutes
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
adminActivitySchema.index({ createdAt: -1 });
adminActivitySchema.index({ type: 1, createdAt: -1 });
adminActivitySchema.index({ priority: 1 });
adminActivitySchema.index({ isRead: 1 });
adminActivitySchema.index({ isFlagged: 1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
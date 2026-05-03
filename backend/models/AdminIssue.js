const mongoose = require('mongoose');

// Status history subdocument schema
const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['reported', 'in_progress', 'resolved', 'archived', 'reopened', 'reopen_requested'],
        required: true
    },
    comment: {
        type: String
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedByName: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Final update subdocument schema
const finalUpdateSchema = new mongoose.Schema({
    statement: {
        type: String,
        required: true
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publishedByName: {
        type: String,
        required: true
    },
    publishedAt: {
        type: Date,
        default: Date.now
    },
    attachments: [{
        url: String,
        type: String
    }]
});

// Main admin issue schema
const adminIssueSchema = new mongoose.Schema({
    originalReportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['pothole', 'broken_light', 'drainage', 'flooding', 'garbage', 'debris', 'hazard', 'other'],
        required: true
    },
    location: {
        address: String,
        lat: Number,
        lng: Number
    },
    photos: [{
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reporterName: {
        type: String,
        required: true
    },
    reporterEmail: String,
    status: {
        type: String,
        enum: ['reported', 'in_progress', 'resolved', 'archived'],
        default: 'reported'
    },
    statusHistory: [statusHistorySchema],
    finalUpdate: finalUpdateSchema,
    upvoteCount: {
        type: Number,
        default: 0
    },
    downvoteCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    resolutionTimeline: {
        reportedAt: Date,
        inProgressAt: Date,
        resolvedAt: Date
    },
    archivedAt: Date,
    reactivatedAt: Date,
    reopenRequested: {
        type: Boolean,
        default: false
    },
    adminNotes: [{
        note: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdByName: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastActivityAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'admin_issues',
    timestamps: true
});

module.exports = mongoose.model('AdminIssue', adminIssueSchema);
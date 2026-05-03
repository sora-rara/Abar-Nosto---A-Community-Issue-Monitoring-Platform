const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const voteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: {
            values: ['pothole', 'broken_light', 'drainage', 'flooding', 'garbage', 'debris', 'hazard', 'other'],
            message: '{VALUE} is not a valid category'
        }
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    },
    photos: [{
        url: {
            type: String,
            required: true
        },
        fileId: {
            type: String,
            required: true
        },
        thumbnailUrl: String,
        caption: String
    }],
    status: {
        type: String,
        enum: ['reported', 'in_progress', 'resolved', 'archived'],
        default: 'reported'
    },

    // Add these fields to your existing schema
    statusHistory: [
        {
            status: {
                type: String,
                enum: ['reported', 'in_progress', 'resolved', 'archived', 'reopened', 'reopen_requested']
            },
            at: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            updatedByName: String,
            comment: String
        }
    ],
    archivedAt: Date,
    reactivatedAt: Date,
    reopenRequested: { type: Boolean, default: false },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reporterName: String,
    contactInfo: {
        email: String,
        phone: String
    },
    // Voting system
    upvotes: [voteSchema],
    downvotes: [voteSchema],
    upvoteCount: {
        type: Number,
        default: 0
    },
    downvoteCount: {
        type: Number,
        default: 0
    },
    // Comments
    comments: [commentSchema],
    commentCount: {
        type: Number,
        default: 0
    },
    similarIssues: [{
        issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
        similarityScore: Number
    }],
    viewCount: {
        type: Number,
        default: 0
    },
    lastActivityAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Update counts before saving
reportSchema.pre('save', async function () {
    this.upvoteCount = this.upvotes?.length || 0;
    this.downvoteCount = this.downvotes?.length || 0;
    this.commentCount = this.comments?.length || 0;
    this.lastActivityAt = Date.now();
});

// Virtual for checking if current user upvoted
reportSchema.virtual('hasUpvoted').get(function () {
    return false; // Will be populated by controller
});

// Virtual for checking if current user downvoted
reportSchema.virtual('hasDownvoted').get(function () {
    return false; // Will be populated by controller
});

// Indexes for better query performance
reportSchema.index({ 'location.lat': 1, 'location.lng': 1 });
reportSchema.index({ category: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ lastActivityAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
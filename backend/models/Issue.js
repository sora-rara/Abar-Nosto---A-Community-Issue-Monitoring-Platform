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
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { 
        type: String, 
        required: true,
        enum: ['pothole', 'broken_light', 'drainage', 'flooding', 'garbage', 'debris', 'other']
    },
    location: {
        address: { type: String, required: true },
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        }
    },
    status: {
        type: String,
        enum: ['reported', 'in_progress', 'resolved'],
        default: 'reported'
    },
    photos: [{
        url: { type: String },
        caption: { type: String }
    }],
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, required: true },
    contactInfo: {
        email: { type: String },
        phone: { type: String }
    },
    // Your features - voting and comments
    upvotes: [voteSchema],
    downvotes: [voteSchema],
    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },
    
    comments: [commentSchema],
    commentCount: { type: Number, default: 0 },
    
    similarIssues: [{
        issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
        similarityScore: { type: Number }
    }],
    
    viewCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'reports' }); // Explicitly set collection name to 'reports'

// Update counts
reportSchema.pre('save', function(next) {
    this.upvoteCount = this.upvotes.length;
    this.downvoteCount = this.downvotes?.length || 0;
    this.commentCount = this.comments.length;
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Report', reportSchema); 
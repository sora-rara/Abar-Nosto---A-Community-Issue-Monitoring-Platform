const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    enableAll: { type: Boolean, default: true },
    onFollowedUpdate: { type: Boolean, default: true },
    onNearbyIssue: { type: Boolean, default: true },
    onStatusChange: { type: Boolean, default: true },
    onNewComment: { type: Boolean, default: true },
    onUpvoteReceived: { type: Boolean, default: true },
    onIssueArchived: { type: Boolean, default: true },
    onIssueReactivated: { type: Boolean, default: true },
    nearbyRadius: { type: Number, default: 1000 }, // meters
    savedLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]

    }
});

preferenceSchema.index({ savedLocation: '2dsphere' });

module.exports = mongoose.model('NotificationPreference', preferenceSchema);
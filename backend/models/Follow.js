const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    createdAt: { type: Date, default: Date.now }
});

followSchema.index({ user: 1, issue: 1 }, { unique: true });
followSchema.index({ issue: 1 }); // for finding followers

module.exports = mongoose.model('Follow', followSchema);
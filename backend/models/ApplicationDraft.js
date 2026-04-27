const mongoose = require('mongoose');

const applicationDraftSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorityId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthorityContact', required: true },
    subject: String,
    message: String,
    contactName: String,
    contactEmail: String,
    contactPhone: String,
    status: { type: String, default: 'draft' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApplicationDraft', applicationDraftSchema);
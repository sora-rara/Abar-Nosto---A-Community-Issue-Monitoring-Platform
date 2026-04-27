const mongoose = require('mongoose');

const draftReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  category: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  photos: [{ url: String, fileId: String, thumbnailUrl: String }],
  contactInfo: {
    email: String,
    phone: String,
  },
  status: { type: String, default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DraftReport', draftReportSchema);
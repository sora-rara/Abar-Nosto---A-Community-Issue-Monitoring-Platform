const mongoose = require('mongoose');

const authorityContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: String,
  cityCorporation: { type: String, enum: ['DNCC', 'DSCC'] },
  ward: String,
  zone: String,
  address: String,
  phone: [String],
  email: [String],
  website: String,
  officeHours: String,
  isActive: { type: Boolean, default: true },
  isSystemManaged: { type: Boolean, default: false }, // true for pre-loaded data
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuthorityContact', authorityContactSchema);
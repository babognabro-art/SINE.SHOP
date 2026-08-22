const mongoose = require('mongoose');
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  videoUrl: { type: String, required: true, trim: true },
  thumbnailUrl: { type: String, trim: true, default: '' },
  audience: { type: [String], enum: ['all','client','seller','livreur','affiliate'], default: ['all'] },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
announcementSchema.index({ isActive: 1, createdAt: -1 });
module.exports = mongoose.model('Announcement', announcementSchema);

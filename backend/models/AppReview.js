const mongoose = require('mongoose');

const appReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  status: {
    type: String,
    enum: ['published', 'hidden'],
    default: 'published',
    index: true,
  },
}, { timestamps: true });

appReviewSchema.index({ user: 1 }, { unique: true });
appReviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AppReview', appReviewSchema);

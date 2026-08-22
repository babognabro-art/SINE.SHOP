const mongoose = require('mongoose');

// NB: ce schéma a été étendu pour correspondre à ce que
// controllers/review.controller.js attend réellement (il utilisait déjà
// review.helpful.count/.users, review.reported.isReported/.reason/.reportedBy,
// review.order, review.verifiedPurchase, review.status, et une méthode statique
// Review.calculateAverageRating — aucun de ces champs/méthodes n'existait avant,
// ce qui aurait fait planter toutes les routes /api/reviews au runtime.
const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
    required: true,
  },
  images: [String],
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  reported: {
    isReported: { type: Boolean, default: false },
    reason: String,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
}, {
  timestamps: true,
});

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });

// Calcule la moyenne, le total et la distribution des notes pour un produit.
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalCount = 0;
  let totalScore = 0;

  stats.forEach((s) => {
    distribution[s._id] = s.count;
    totalCount += s.count;
    totalScore += s._id * s.count;
  });

  return {
    average: totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0,
    count: totalCount,
    distribution,
  };
};

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

// routes/review.routes.js
const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  markHelpful,
  reportReview,
  getPendingReviews,
  moderateReview,
} = require('../controllers/review.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Routes publiques
router.get('/product/:productId', getProductReviews);

// Routes privées
router.use(protect);
router.get('/pending', authorize('moderator', 'admin', 'superadmin'), getPendingReviews);
router.put('/:id/moderate', authorize('moderator', 'admin', 'superadmin'), moderateReview);
router.post('/', createReview);
router.put('/:id/helpful', markHelpful);
router.put('/:id/report', reportReview);

module.exports = router;
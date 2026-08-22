const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createAppReview,
  getMyAppReview,
  getAppReviewsAdmin,
  setAppReviewStatus,
} = require('../controllers/appReview.controller');

router.use(protect);
router.get('/me', getMyAppReview);
router.post('/', createAppReview);
router.get('/admin', authorize('admin', 'superadmin', 'moderator'), getAppReviewsAdmin);
router.put('/:id/status', authorize('admin', 'superadmin', 'moderator'), setAppReviewStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize, isSeller } = require('../middlewares/auth.middleware');
const { uploadFields } = require('../middlewares/upload.middleware');
const {
  getSellerProfile,
  updateSellerProfile,
  getSellerStats,
  getSellerOrders,
  verifySeller,
} = require('../controllers/seller.controller');

router.get('/profile/:id?', protect, getSellerProfile);
router.put('/profile', protect, isSeller, uploadFields([
  { name: 'storeLogo', maxCount: 1 },
  { name: 'storeBanner', maxCount: 1 },
]), updateSellerProfile);
router.get('/stats/:id?', protect, getSellerStats);
router.get('/orders/:id?', protect, getSellerOrders);
router.put('/verify/:id', protect, authorize('admin', 'superadmin'), verifySeller);

module.exports = router;
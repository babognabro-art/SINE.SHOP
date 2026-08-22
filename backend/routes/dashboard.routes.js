const express = require('express');
const router = express.Router();
const { protect, authorize, isSeller, isLivreur } = require('../middlewares/auth.middleware');
const {
  getDashboard,
  getAdminDashboard,
  getSellerDashboard,
  getLivreurDashboard,
} = require('../controllers/dashboard.controller');

router.get('/', protect, getDashboard);
router.get('/admin', protect, authorize('admin', 'superadmin'), getAdminDashboard);
router.get('/seller', protect, isSeller, getSellerDashboard);
router.get('/livreur', protect, isLivreur, getLivreurDashboard);

module.exports = router;
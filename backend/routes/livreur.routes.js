const express = require('express');
const router = express.Router();
const { protect, authorize, isLivreur } = require('../middlewares/auth.middleware');
const {
  getLivreurProfile,
  updateLivreurLocation,
  getAvailableLivreurs,
  assignLivreurToOrder,
  updateDeliveryStatus,
  getLivreurDeliveries,
} = require('../controllers/livreur.controller');
const {
  getLivreurBalance,
  requestLivreurWithdrawal,
  getLivreurWithdrawals,
} = require('../controllers/livreur-payment.controller');

router.get('/profile/:id?', protect, getLivreurProfile);
router.put('/location', protect, isLivreur, updateLivreurLocation);
router.get('/available', protect, getAvailableLivreurs);
router.post('/assign', protect, authorize('admin', 'superadmin', 'seller'), assignLivreurToOrder);
router.put('/delivery-status', protect, isLivreur, updateDeliveryStatus);
router.get('/deliveries/:id?', protect, getLivreurDeliveries);

// Retrait des gains — construit en Phase 2, n'existait nulle part avant.
router.get('/balance', protect, isLivreur, getLivreurBalance);
router.post('/withdraw', protect, isLivreur, requestLivreurWithdrawal);
router.get('/withdrawals', protect, isLivreur, getLivreurWithdrawals);

module.exports = router;
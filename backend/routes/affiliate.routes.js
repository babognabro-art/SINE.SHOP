const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createAffiliate,
  getAffiliateStats,
  getAffiliateByCode,
  trackReferral,
  getReferrals,
  updateCommissionRate,
  updatePayoutMethods,
  createWithdrawal,
  getMyWithdrawals,
} = require('../controllers/affiliate.controller');

router.post('/create', protect, createAffiliate);
router.get('/stats', protect, getAffiliateStats);
router.get('/code/:code', getAffiliateByCode);
router.post('/track/:code', trackReferral);
router.get('/referrals', protect, getReferrals);
router.put('/commission', protect, updateCommissionRate);
router.put('/payout-methods', protect, updatePayoutMethods);
router.post('/withdrawals', protect, createWithdrawal);
router.get('/withdrawals', protect, getMyWithdrawals);

module.exports = router;
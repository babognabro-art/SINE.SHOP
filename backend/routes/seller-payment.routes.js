const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getSellerBalance,
  requestSellerWithdrawal,
  getSellerWithdrawals,
} = require('../controllers/seller-payment.controller');

router.use(protect, authorize('seller'));

router.get('/balance', getSellerBalance);
router.post('/withdraw', requestSellerWithdrawal);
router.get('/withdrawals', getSellerWithdrawals);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { sensitiveLimiter } = require('../middlewares/rateLimit.middleware');
const { getMyWallet, payWithWallet, creditWalletManual, getWalletTransactions } = require('../controllers/wallet.controller');

router.use(protect);

router.get('/', getMyWallet);
router.get('/transactions', getWalletTransactions);
router.post('/pay', sensitiveLimiter, payWithWallet);
// Réservé finance_admin/superadmin — action financière, même logique que
// financeAdmin.routes.js (matrice de permissions : Finances = ❌ pour un
// admin général classique).
router.post('/credit-manual', authorize('finance_admin', 'superadmin'), sensitiveLimiter, creditWalletManual);

module.exports = router;

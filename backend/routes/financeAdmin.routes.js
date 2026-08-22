const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getFinanceDashboard,
  getFinancialLedger,
  getFinanceConfig,
  updateFinanceConfig,
  listPaymentMethodsAdmin,
  togglePaymentMethod,
  listRefunds,
  createRefund,
  updateRefundStatus,
} = require('../controllers/financeAdmin.controller');
// Réutilisé tel quel — même logique que /api/official/payments, mais
// accessible ici avec le token admin classique (sineToken), pas le token
// cloisonné du Centre Officiel. Aucune logique dupliquée : un seul
// contrôleur, deux points d'accès protégés différemment selon qui doit
// pouvoir s'en servir.
const { listWithdrawals, markWithdrawalPaid, rejectWithdrawal } = require('../controllers/payoutAdmin.controller');

// Réservé admin/superadmin — c'est l'espace financier interne, jamais
// accessible à un vendeur/livreur/affilié même via leur propre tableau de
// bord (qui ne montrent que LEURS chiffres, jamais la vue globale).
// Réservé finance_admin/superadmin — c'est l'espace financier interne.
// Matrice de permissions (document architecture admin) : un admin
// "général" classique n'a PAS accès aux finances (❌), contrairement à ce
// qui était le cas avant cette correction — seul finance_admin et
// superadmin y accèdent, jamais un vendeur/livreur/affilié même via leur
// propre tableau de bord (qui ne montrent que LEURS chiffres).
router.use(protect, authorize('finance_admin', 'superadmin'));

router.get('/dashboard', getFinanceDashboard);
router.get('/ledger', getFinancialLedger);

// Configuration financière — LA section "Paramètres" (commission,
// plafonds fidélité, délais, minimums de retrait).
router.get('/config', getFinanceConfig);
router.put('/config', updateFinanceConfig);

router.get('/payment-methods', listPaymentMethodsAdmin);
router.put('/payment-methods/:provider', togglePaymentMethod);

router.get('/refunds', listRefunds);
router.post('/refunds', createRefund);
router.put('/refunds/:id/status', updateRefundStatus);

// Retraits vendeurs/livreurs/affiliés — même contrôleur que le Centre
// Officiel (/api/official/payments), monté ici avec l'authentification
// admin classique pour que admin-finance.html puisse aussi les gérer.
router.get('/payouts', listWithdrawals);
router.put('/payouts/:id/pay', markWithdrawalPaid);
router.put('/payouts/:id/reject', rejectWithdrawal);

module.exports = router;

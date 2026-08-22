const express = require('express');
const router = express.Router();
const { protectOfficial } = require('../middlewares/official.middleware');
const { authLimiter, sensitiveLimiter } = require('../middlewares/rateLimit.middleware');
const {
  registerOfficial,
  loginOfficial,
  getOfficialUserCount,
} = require('../controllers/officialAuth.controller');

// Réutilise EXACTEMENT la même logique déjà construite et vérifiée pour
// administrateur.html/superadministrateur.html — même source de vérité
// pour les statistiques et actions, jamais deux implémentations
// divergentes du même calcul.
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getSystemStats,
  getAllOrdersAdmin,
} = require('../controllers/admin.controller');
const { getProducts } = require('../controllers/product.controller');
const { listWithdrawals, markWithdrawalPaid, rejectWithdrawal } = require('../controllers/payoutAdmin.controller');

// =====================================================
// AUTHENTIFICATION — limitée en débit comme les autres points sensibles
// (empêche le brute-force du mot de passe, 6 comptes seulement à
// deviner rend cette route particulièrement sensible).
// =====================================================
router.post('/auth/register', authLimiter, sensitiveLimiter, registerOfficial);
router.post('/auth/login', authLimiter, sensitiveLimiter, loginOfficial);
router.get('/auth/count', getOfficialUserCount);

// =====================================================
// DONNÉES RÉELLES — tout ce qui suit exige le token 'official'.
// =====================================================
router.use(protectOfficial);

router.get('/dashboard', getDashboardStats);
router.get('/system-stats', getSystemStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/orders', getAllOrdersAdmin);
router.get('/products', getProducts);

// Attribution des paies (vendeurs + affiliés) — n'existait nulle part.
router.get('/payments', listWithdrawals);
router.put('/payments/:id/pay', markWithdrawalPaid);
router.put('/payments/:id/reject', rejectWithdrawal);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { adminLimiter } = require('../middlewares/rateLimit.middleware');
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getSystemStats,
  getAllOrdersAdmin,
} = require('../controllers/admin.controller');

router.get('/dashboard', protect, authorize('admin', 'superadmin', 'moderator'), getDashboardStats);
// Lecture des utilisateurs — le support en a besoin pour aider un client
// (voir son statut, ses coordonnées) sans jamais pouvoir le modifier —
// n'était pas autorisé du tout avant, alors que le tableau de permissions
// du document le prévoit explicitement (accès lecture seule au support).
router.get('/users', protect, authorize('admin', 'superadmin', 'moderator', 'support'), getAllUsers);
// adminLimiter (50/heure) réservé aux actions destructives/sensibles — pas
// aux simples lectures (dashboard/liste), pour ne pas gêner le travail
// normal d'un admin qui consulte fréquemment. Existait déjà dans
// rateLimit.middleware.js mais n'était utilisé nulle part.
router.put('/users/:id/status', protect, authorize('admin', 'superadmin'), adminLimiter, updateUserStatus);
router.delete('/users/:id', protect, authorize('admin', 'superadmin'), adminLimiter, deleteUser);
router.get('/system/stats', protect, authorize('admin', 'superadmin', 'moderator'), getSystemStats);
// Lecture des commandes — même correctif : finance_admin (litiges de
// paiement), modérateur (enquêtes) et support (aide client) doivent tous
// pouvoir CONSULTER une commande, aucun d'eux ne pouvait le faire avant.
// Toujours lecture seule (GET) — jamais de droit d'écriture ajouté ici.
router.get('/orders', protect, authorize('admin', 'superadmin', 'finance_admin', 'moderator', 'support'), getAllOrdersAdmin);

module.exports = router;
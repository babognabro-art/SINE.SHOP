const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { getScanPayLink, getScanPayStatus } = require('../controllers/scanPay.controller');

// Réservé au livreur assigné (ou un admin) — génère le lien/QR à afficher.
router.get('/:orderId/link', protect, getScanPayLink);

// Public — le client vient de scanner, pas forcément connecté. Protégé
// par la signature (exp+sig), pas par un compte (voir scanPay.controller.js).
router.get('/:orderId/status', getScanPayStatus);

module.exports = router;

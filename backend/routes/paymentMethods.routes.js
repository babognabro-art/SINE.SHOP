const express = require('express');
const router = express.Router();
const { getPaymentMethods } = require('../controllers/paymentMethods.controller');

// Public — le client doit voir quels moyens de paiement sont disponibles
// avant même de se connecter (page produit, aperçu commande).
router.get('/', getPaymentMethods);

module.exports = router;

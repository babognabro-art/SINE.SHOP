const express = require('express');
const router = express.Router();
const { receiveWhatsAppWebhook } = require('../controllers/whatsapp.controller');

// Public — appelée par Infobip, pas par un utilisateur connecté. Pas de
// middleware `protect` ici (impossible, Infobip n'a pas de token
// SINE.SHOP). La sécurité de ce endpoint repose sur le secret de l'URL
// elle-même (voir note dans routes/index.js) — à renforcer plus tard
// avec une vraie vérification de signature si Infobip la propose.
router.post('/whatsapp', receiveWhatsAppWebhook);

module.exports = router;

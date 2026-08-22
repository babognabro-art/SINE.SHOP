const express = require('express');

const {
    protect: authenticateToken
} = require('../middlewares/auth.middleware');

const {
    getProfile,
    updateProfile,
    updatePassword,
    deleteAccount,
    getAvailableLivreurs,
    requestPhoneVerification,
    confirmPhoneVerification,
    requestEmailChange,
    confirmEmailChange
} = require('../controllers/user.controller');
const { sensitiveLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// =====================================
// PROFIL UTILISATEUR
// =====================================

// Nécessite d'être connecté (client/vendeur suggérant un livreur en
// messagerie) mais pas un rôle particulier — pas de données sensibles
// exposées (voir getAvailableLivreurs, champs sélectionnés).
router.get(
    '/livreurs',
    authenticateToken,
    getAvailableLivreurs
);

router.get(
    '/me',
    authenticateToken,
    getProfile
);

router.put(
    '/me',
    authenticateToken,
    updateProfile
);

router.put(
    '/me/password',
    authenticateToken,
    updatePassword
);

// =========================================================
// ✅ WHATSAPP PRIORITY — Les codes seront envoyés via WhatsApp d'abord
// =========================================================
router.post('/me/phone/request-verification', authenticateToken, sensitiveLimiter, requestPhoneVerification);
router.post('/me/phone/confirm-verification', authenticateToken, confirmPhoneVerification);

// Changement d'email vérifié — même logique de protection.
router.post('/me/email/request-change', authenticateToken, sensitiveLimiter, requestEmailChange);
router.post('/me/email/confirm-change', authenticateToken, confirmEmailChange);

router.delete(
    '/me',
    authenticateToken,
    deleteAccount
);

module.exports = router;
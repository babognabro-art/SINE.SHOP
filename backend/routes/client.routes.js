const express = require('express');

const {
    protect: authenticateToken
} = require('../middlewares/auth.middleware');

const {
    getProfile,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    getOrderHistory
} = require('../controllers/client.controller');

const router = express.Router();

// =====================================
// PROFIL
// =====================================

router.get(
    '/profile',
    authenticateToken,
    getProfile
);

router.put(
    '/profile',
    authenticateToken,
    updateProfile
);

// =====================================
// ADRESSES
// =====================================

router.post(
    '/addresses',
    authenticateToken,
    addAddress
);

router.put(
    '/addresses/:id',
    authenticateToken,
    updateAddress
);

router.delete(
    '/addresses/:id',
    authenticateToken,
    deleteAddress
);

// =====================================
// COMMANDES
// =====================================

router.get(
    '/orders',
    authenticateToken,
    getOrderHistory
);

module.exports = router;
const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadFields, handleUploadError } = require('../middlewares/upload.middleware');
const { submitKyc, getMyKyc, getAllKyc, reviewKyc } = require('../controllers/kyc.controller');

const kycUpload = uploadFields([
  { name: 'documentFront', maxCount: 1 },
  { name: 'documentBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

// Compte connecté (vendeur, livreur, affilié, client...) — soumet ou consulte
// sa propre vérification d'identité.
router.post('/', protect, authLimiter, kycUpload, handleUploadError, submitKyc);
router.get('/me', protect, getMyKyc);

// Réservé aux admins — file d'attente et décision.
router.get('/', protect, authorize('admin', 'superadmin'), getAllKyc);
router.put('/:id/review', protect, authorize('admin', 'superadmin'), reviewKyc);

module.exports = router;

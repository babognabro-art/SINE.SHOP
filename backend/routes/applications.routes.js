const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadFields, handleUploadError } = require('../middlewares/upload.middleware');
const { submitAdminApplication, getAdminApplications, viewApplicationFile } = require('../controllers/adminApplication.controller');

const applicationUpload = uploadFields([
  { name: 'cv', maxCount: 1 },
  { name: 'letter', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 },
  { name: 'proof', maxCount: 1 },
]);

// Public — pas de compte requis pour candidater.
router.post(
  '/admin',
  authLimiter,
  applicationUpload,
  handleUploadError,
  submitAdminApplication
);

// Réservé aux admins — liste des candidatures pour revue.
router.get('/admin', protect, authorize('admin', 'superadmin'), getAdminApplications);

// Public MAIS protégé par signature+expiration (pas par compte) — permet au
// Boss d'ouvrir une pièce jointe directement depuis son client mail, sans
// étape de connexion, tout en restant infalsifiable (voir
// adminApplication.controller.js::signApplicationFileToken).
router.get('/admin/:id/file/:type', viewApplicationFile);

module.exports = router;

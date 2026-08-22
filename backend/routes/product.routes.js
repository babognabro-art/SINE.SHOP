const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadFields, handleUploadError } = require('../middlewares/upload.middleware');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
} = require('../controllers/product.controller');

// Routes publiques
router.get('/', getProducts);
router.get('/seller/:sellerId', getSellerProducts);
router.get('/:id', getProduct);

// Routes protégées
// 🔴 'superadmin' manquait sur les 3 routes ci-dessous — authorize() n'a
// AUCUN passe-droit automatique pour superadmin (vérifié dans
// auth.middleware.js), donc même le rôle le plus élevé ne pouvait pas
// créer/modifier/supprimer un produit via ces routes tant qu'il n'était
// pas explicitement listé. Corrigé pour les 3.
router.post(
  '/',
  protect,
  authorize('seller', 'admin', 'superadmin'),
  uploadFields([{ name: 'images', maxCount: 8 }, { name: 'videos', maxCount: 3 }]),
  handleUploadError,
  createProduct
);
router.put(
  '/:id',
  protect,
  authorize('seller', 'admin', 'superadmin'),
  // Manquait entièrement : sans ce middleware, une requête multipart/form-data
  // (utilisée par vendeur.html pour l'édition avec nouvelles images/vidéos)
  // n'était jamais parsée — req.body arrivait vide au contrôleur, donc
  // éditer un produit ne changeait littéralement rien.
  uploadFields([{ name: 'images', maxCount: 8 }, { name: 'videos', maxCount: 3 }]),
  handleUploadError,
  updateProduct
);
router.delete('/:id', protect, authorize('seller', 'admin', 'superadmin'), deleteProduct);

module.exports = router;
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');

// Routes publiques
router.get('/', getCategories);
router.get('/:id', getCategory);

// Routes protégées — un vendeur peut créer sa propre catégorie (racine
// uniquement), modifier/supprimer restent réservés aux admins.
router.post('/', protect, authorize('admin', 'superadmin', 'seller'), uploadSingle('image'), createCategory);
router.put('/:id', protect, authorize('admin', 'superadmin'), uploadSingle('image'), updateCategory);
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteCategory);

module.exports = router;
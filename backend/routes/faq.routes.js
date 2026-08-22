const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  searchFaq,
  getCategories,
  getByCategory,
  getFaqById,
  rateFaq,
  getPopular,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllFaqAdmin,
} = require('../controllers/faq.controller');

router.use(protect);

router.get('/search', searchFaq);
router.get('/categories', getCategories);
router.get('/popular', getPopular);
router.get('/category/:category', getByCategory);

// Gestion — réservée à l'équipe admin, pour continuer d'enrichir la base
// sans jamais devoir toucher au code. Montée AVANT /:id, sinon "admin"
// serait capturé comme un identifiant de fiche FAQ.
router.get('/admin/all', authorize('admin', 'superadmin'), getAllFaqAdmin);
router.post('/', authorize('admin', 'superadmin'), createFaq);
router.put('/:id', authorize('admin', 'superadmin'), updateFaq);
router.delete('/:id', authorize('admin', 'superadmin'), deleteFaq);

router.get('/:id', getFaqById);
router.post('/:id/rate', rateFaq);

module.exports = router;

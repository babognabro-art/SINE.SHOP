const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  submitAccountActionRequest,
  getAccountActionRequests,
  reviewAccountActionRequest,
} = require('../controllers/accountAction.controller');

router.use(protect);

// N'importe quel compte (client, vendeur, livreur...) peut soumettre une
// demande sur SON PROPRE compte.
router.post('/', submitAccountActionRequest);

// Réservé à l'équipe admin — lister et traiter les demandes.
router.get('/', authorize('admin', 'superadmin', 'moderator'), getAccountActionRequests);
router.put('/:id/review', authorize('admin', 'superadmin', 'moderator'), reviewAccountActionRequest);

module.exports = router;

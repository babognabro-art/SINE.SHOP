const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute,
} = require('../controllers/dispute.controller');

router.use(protect);

router.post('/', createDispute);
router.get('/me', getMyDisputes);
router.get('/', authorize('moderator', 'admin', 'superadmin'), getAllDisputes);
router.put('/:id/resolve', authorize('moderator', 'admin', 'superadmin'), resolveDispute);

module.exports = router;

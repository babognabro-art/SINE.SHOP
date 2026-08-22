const express = require('express');
const router = express.Router();
const { protect, isSuperAdmin } = require('../middlewares/auth.middleware');
const { sensitiveLimiter } = require('../middlewares/rateLimit.middleware');
const { createAdminInvite, getInviteByToken, listAdminInvites } = require('../controllers/adminInvite.controller');

router.post('/', protect, isSuperAdmin, sensitiveLimiter, createAdminInvite);
router.get('/', protect, isSuperAdmin, listAdminInvites);
// Public — la personne invitée n'a pas encore de compte pour s'authentifier.
router.get('/:token', getInviteByToken);

module.exports = router;

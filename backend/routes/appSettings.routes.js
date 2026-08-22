const express = require('express');
const router = express.Router();
const { protect, isSuperAdmin } = require('../middlewares/auth.middleware');
const { getSettings, updateSettings } = require('../controllers/appSettings.controller');

router.get('/', protect, getSettings);
router.put('/', protect, isSuperAdmin, updateSettings);

module.exports = router;

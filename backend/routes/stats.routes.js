const express = require('express');
const adminMiddleware = require('../middlewares/admin.middleware');
const { getGlobalStats } = require('../controllers/stats.controller');

const router = express.Router();

router.get('/global', adminMiddleware, getGlobalStats);

module.exports = router;
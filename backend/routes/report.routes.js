const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createReport,
  getAllReports,
  reviewReport,
} = require('../controllers/report.controller');

router.post('/', protect, createReport);
router.get('/', protect, authorize('support', 'moderator', 'admin', 'superadmin'), getAllReports);
router.put('/:id/review', protect, authorize('support', 'moderator', 'admin', 'superadmin'), reviewReport);

module.exports = router;

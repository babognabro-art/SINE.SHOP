const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { getComparison, toggleComparison, clearComparison } = require('../controllers/comparison.controller');

router.use(protect);

router.get('/', getComparison);
router.post('/:productId', toggleComparison);
router.delete('/', clearComparison);

module.exports = router;

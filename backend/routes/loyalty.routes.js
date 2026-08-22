const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { getMyLoyalty, previewRedeemable } = require('../controllers/loyalty.controller');

router.use(protect);

router.get('/', getMyLoyalty);
router.get('/preview/:orderId', previewRedeemable);

module.exports = router;

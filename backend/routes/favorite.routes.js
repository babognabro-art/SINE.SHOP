// routes/favorite.routes.js
const express = require('express');
const router = express.Router();
const {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite,
  getSellerFavoriteStats,
} = require('../controllers/favorite.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/seller-stats', getSellerFavoriteStats);
router.get('/', getFavorites);
router.get('/check/:productId', checkFavorite);
router.post('/', addFavorite);
router.delete('/:productId', removeFavorite);

module.exports = router;
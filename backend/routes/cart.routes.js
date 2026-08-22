const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getCart,
  addToCart,
  removeFromCart,
  deleteFromCart,
  clearCart,
  updateCartItem,
  updateCartItemAttributes,
  getCartTotal,
} = require('../controllers/cart.controller');

router.use(protect);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/remove/:productId', removeFromCart);
router.delete('/delete/:productId', deleteFromCart);
router.delete('/clear', clearCart);
router.put('/update', updateCartItem);
router.put('/update-attributes', updateCartItemAttributes);
router.get('/total', getCartTotal);

module.exports = router;
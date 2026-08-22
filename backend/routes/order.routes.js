const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createOrder,
  confirmOrder,
  trackOrder,
  updateDeliveryStatus,
  getOrders,
  getOrder,
  getOrderInvoice,
  getOrderGroup,
  cancelOrder,
  getSellerOrders,
} = require('../controllers/order.controller');

router.use(protect);

router.post('/', createOrder);
router.put('/:orderId/confirm', confirmOrder);
router.get('/:orderId/track', trackOrder);
router.put('/:orderId/delivery', authorize('livreur', 'admin', 'superadmin'), updateDeliveryStatus);
router.get('/', getOrders);
router.get('/seller/orders', authorize('seller'), getSellerOrders);
router.get('/group/:orderGroup', getOrderGroup);
router.get('/:orderId/invoice', getOrderInvoice);
router.get('/:orderId', getOrder);
router.put('/:orderId/cancel', cancelOrder);

module.exports = router;
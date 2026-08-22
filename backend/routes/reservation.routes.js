const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createReservation,
  getReservations,
  getReservation,
  getSellerReservations,
  updateReservationStatus,
  cancelReservation,
} = require('../controllers/reservation.controller');

router.use(protect);

router.post('/', createReservation);
router.get('/', getReservations);
router.get('/seller', authorize('seller'), getSellerReservations);
router.get('/:id', getReservation);
router.put('/:id/status', authorize('seller', 'admin', 'superadmin'), updateReservationStatus);
router.put('/:id/cancel', cancelReservation);

module.exports = router;
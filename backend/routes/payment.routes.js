const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  createPayment,
  confirmPayment,
  getPaymentHistory,
  refundPayment,
  handleWebhook,
} = require('../controllers/payment.controller');

// Route publique — appelée par les serveurs CinetPay, doit rester AVANT protect
router.post('/webhook', handleWebhook);

router.use(protect);

router.post('/', createPayment);
router.post('/confirm', confirmPayment);
router.get('/history', getPaymentHistory);
// superadmin manquait (authorize() n'a aucun passe-droit automatique) ;
// finance_admin ajouté aussi — un remboursement est une action financière,
// exactement le périmètre que le document attribue à ce rôle.
router.post('/:paymentId/refund', authorize('admin', 'superadmin', 'finance_admin'), refundPayment);

module.exports = router;
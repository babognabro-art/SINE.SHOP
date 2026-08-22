// Adaptateur entre les contrôleurs (payment.controller.js, order.controller.js)
// et config/payment.js (qui contient la vraie intégration Stripe).
// NB: ce fichier contenait deux versions dupliquées qui provoquaient une
// SyntaxError (double déclaration de "stripe"), et appelaient de toute façon
// des méthodes qui n'existaient nulle part (PaymentService.createIntent /
// .refund n'étaient jamais exportées). Les contrôleurs référencent aussi
// order.total et order.user (pas order.finalAmount / order.client, qui
// n'existent pas dans le schéma Order).
const {
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
} = require('../config/payment');

const createIntent = async (amount, currency = 'XOF', metadata = {}) => {
  return await createPaymentIntent(amount, currency, metadata);
};

const confirmPayment = async (paymentIntentId) => {
  return await confirmPaymentIntent(paymentIntentId);
};

const cancelPayment = async (paymentIntentId) => {
  return await cancelPaymentIntent(paymentIntentId);
};

const refund = async (paymentIntentId, amount = null) => {
  return await createRefund(paymentIntentId, amount);
};

module.exports = { createIntent, confirmPayment, cancelPayment, refund };

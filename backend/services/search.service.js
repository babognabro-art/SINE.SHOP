const { createPaymentIntent, confirmPaymentIntent, cancelPaymentIntent, createRefund, paymentEnabled } = require('../config/payment');

class PaymentService {
  static async createIntent(amount, currency = 'XOF', metadata = {}) {
    return await createPaymentIntent(amount, currency, metadata);
  }

  static async confirmPayment(paymentIntentId) {
    return await confirmPaymentIntent(paymentIntentId);
  }

  static async cancelPayment(paymentIntentId) {
    return await cancelPaymentIntent(paymentIntentId);
  }

  static async refund(paymentIntentId, amount = null) {
    return await createRefund(paymentIntentId, amount);
  }

  static isEnabled() {
    return paymentEnabled;
  }

  static async processPayment(amount, currency = 'XOF', paymentMethod, metadata = {}) {
    try {
      // Créer l'intention de paiement
      const intent = await this.createIntent(amount, currency, {
        ...metadata,
        paymentMethod,
      });

      // Confirmer le paiement
      const confirmed = await this.confirmPayment(intent.id);

      return {
        success: confirmed.status === 'succeeded',
        paymentIntent: confirmed,
        clientSecret: intent.client_secret,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;
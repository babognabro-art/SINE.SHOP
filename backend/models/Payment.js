const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Commande "principale" (la première créée du groupe) — conservée pour
  // compatibilité avec le code existant qui affiche un paiement lié à une
  // commande. Pour un panier multi-vendeurs, le vrai lien complet est
  // orderGroup (voir models/Order.js) : toutes les commandes du même
  // passage en caisse partagent CE MÊME paiement, un client ne paie qu'une
  // seule fois même si sa commande est répartie entre plusieurs vendeurs.
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderGroup: {
    type: String,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'XOF',
  },
  method: {
    type: String,
    enum: ['sinepay', 'card', 'wave', 'orange_money', 'mtn_money', 'visa', 'mastercard', 'cash_on_delivery'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: String,
  paymentIntentId: String,
  metadata: {
    type: Map,
    of: String,
  },
  refundedAt: Date,
  refundAmount: Number,
  failureReason: String,
}, {
  timestamps: true,
});

paymentSchema.index({ user: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });

// Virtual for payment reference
paymentSchema.virtual('reference').get(function() {
  return `PAY-${this._id.toString().slice(-6).toUpperCase()}`;
});

paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
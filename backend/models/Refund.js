const mongoose = require('mongoose');

// Remboursement — distinct des champs refundedAt/refundAmount déjà
// présents sur Payment.js (gardés pour compatibilité), mais qui ne
// permettaient ni de tracer une raison, ni un statut de traitement, ni
// l'identifiant de transaction de remboursement côté prestataire.
const refundSchema = new mongoose.Schema({
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  refundTransactionId: String,
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);

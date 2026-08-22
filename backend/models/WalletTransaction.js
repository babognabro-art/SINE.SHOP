const mongoose = require('mongoose');

// Historique immuable des mouvements du Wallet — jamais modifié ni
// supprimé après création, seulement consulté. Chaque recharge ou
// paiement par wallet crée une entrée ici (voir services/wallet.service.js).
const walletTransactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['recharge', 'payment', 'refund', 'admin_adjustment'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  // Pour une recharge : le prestataire utilisé (wave/orange_money/mtn_money).
  // Pour un paiement : la commande réglée.
  provider: {
    type: String,
    enum: ['wave', 'orange_money', 'mtn_money', 'admin', null],
    default: null,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  orderGroup: String,
  providerTransactionId: String,
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);

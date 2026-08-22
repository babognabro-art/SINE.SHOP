const mongoose = require('mongoose');

// =====================================================
// SINE.SHOP WALLET — le vrai portefeuille rechargeable, distinct du
// solde de fidélité (voir LoyaltyWallet.js). Ne JAMAIS mélanger les
// deux dans une même collection — le wallet peut payer une commande
// intégralement et être remboursé, la fidélité ne peut que réduire
// partiellement une commande et n'est jamais remboursable/retirable.
// =====================================================
const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  // Le solde n'est JAMAIS modifié directement depuis une route publique —
  // uniquement via services/wallet.service.js (credit/debit), qui écrit
  // aussi systématiquement une WalletTransaction ET une FinancialLedger
  // en même temps, pour qu'aucun mouvement d'argent n'existe sans trace.
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockReason: String,
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);

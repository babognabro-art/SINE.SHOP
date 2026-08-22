const mongoose = require('mongoose');

// =====================================================
// JOURNAL FINANCIER SINE.SHOP — chaque mouvement d'argent RÉEL (paiement
// reçu, commission prélevée, part vendeur bloquée puis débloquée, retrait
// payé, remboursement...) crée une entrée ICI, en plus de sa trace dans
// le modèle métier concerné (Payment, Withdrawal, Wallet...). Jamais
// modifié ni supprimé après création — sert de base à tous les audits et
// à la réconciliation avec le relevé du prestataire de paiement (Wave).
// =====================================================
const financialLedgerSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'payment_received',      // argent entrant (client → SINE.SHOP)
      'commission',            // commission SINE.SHOP prélevée
      'seller_payout_held',    // part vendeur bloquée en attente de déblocage
      'seller_payout_released',// part vendeur débloquée (disponible au retrait)
      'withdrawal_paid',       // retrait effectivement payé (vendeur/affilié/livreur)
      'refund',                // remboursement client
      'wallet_recharge',       // rechargement du wallet
      'wallet_payment',        // paiement effectué via le wallet
      'loyalty_credit',        // cashback fidélité crédité
      'loyalty_redeemed',      // fidélité utilisée pour réduire une commande
    ],
    required: true,
  },
  direction: {
    type: String,
    enum: ['credit', 'debit'], // du point de vue de la trésorerie SINE.SHOP
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  orderGroup: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  provider: {
    type: String,
    enum: ['wave', 'orange_money', 'mtn_money', 'sine_wallet', 'cash_on_delivery', 'admin', null],
    default: null,
  },
  providerTransactionId: String,
  description: String,
}, { timestamps: true });

financialLedgerSchema.index({ createdAt: -1 });
financialLedgerSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('FinancialLedger', financialLedgerSchema);

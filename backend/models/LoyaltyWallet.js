const mongoose = require('mongoose');

// =====================================================
// FIDÉLITÉ SINE.SHOP — volontairement PAS appelé "argent" : ce solde ne
// peut jamais être retiré, transféré ni envoyé à quelqu'un, seulement
// utilisé pour réduire une commande éligible (plafonné à 0,2% du montant
// de la commande — voir loyalty.controller.js). Palier basé sur le
// nombre d'achats validés, cashback crédité automatiquement après
// paiement confirmé (voir services/loyalty.service.js).
// =====================================================
const TIERS = [
  { name: 'depart', minPurchases: 0, rate: 0.03 },
  { name: 'bronze', minPurchases: 3, rate: 0.08 },
  { name: 'argent', minPurchases: 6, rate: 0.15 },
  { name: 'or', minPurchases: 11, rate: 0.25 },
  { name: 'premium', minPurchases: 21, rate: 0.40 },
];

const loyaltyWalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  // Nombre d'achats validés (payés + livrés) — détermine le palier de
  // cashback appliqué sur les prochains achats éligibles.
  validatedPurchases: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
}, { timestamps: true });

loyaltyWalletSchema.methods.getCurrentTier = function () {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (this.validatedPurchases >= tier.minPurchases) current = tier;
  }
  return current;
};

loyaltyWalletSchema.statics.TIERS = TIERS;

module.exports = mongoose.model('LoyaltyWallet', loyaltyWalletSchema);

const mongoose = require('mongoose');

// Demande de retrait — affilié OU vendeur (voir `type` ci-dessous). Le solde
// disponible n'est jamais stocké directement : il se calcule à la volée
// à partir des gains bruts (Affiliate.totalCommission pour un affilié,
// somme des commandes livrées et payées pour un vendeur) moins la somme
// des retraits non "rejected" du même type, pour éviter toute
// désynchronisation entre deux champs.
const withdrawalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['affiliate', 'seller', 'livreur'],
      default: 'affiliate',
    },
    // Rempli uniquement pour type='affiliate' — un retrait vendeur n'a pas
    // de document Affiliate associé.
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Affiliate',
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
    method: {
      type: String,
      enum: ['mtn', 'orange', 'wave', 'paypal', 'bank'],
      required: true,
    },
    account: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

withdrawalSchema.index({ affiliate: 1 });
withdrawalSchema.index({ user: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ type: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);

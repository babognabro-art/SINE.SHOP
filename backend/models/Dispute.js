const mongoose = require('mongoose');

// Litige entre un client et un vendeur au sujet d'une commande précise
// (produit non reçu, non conforme, demande de remboursement, etc.) —
// distinct des Report (signalement d'un contenu/utilisateur problématique) :
// un litige porte toujours sur une commande, et implique deux parties
// identifiées (celui qui l'ouvre et l'autre partie concernée).
const disputeSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['not_received', 'not_as_described', 'damaged', 'refund_request', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open',
    },
    resolution: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

disputeSchema.index({ order: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ against: 1 });
disputeSchema.index({ status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);

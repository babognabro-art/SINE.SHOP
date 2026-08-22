const mongoose = require('mongoose');

// Signalement — un utilisateur signale un message, un produit, ou un autre
// utilisateur comme inapproprié. Traité ensuite par un modérateur ou un
// administrateur (voir controllers/report.controller.js).
const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['message', 'product', 'user', 'review'],
      required: true,
    },
    // ID du message/produit/utilisateur/avis signalé — pas de référence
    // stricte à un seul modèle, targetType indique lequel consulter.
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    details: String,
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    resolutionNote: String,
  },
  { timestamps: true }
);

reportSchema.index({ status: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);

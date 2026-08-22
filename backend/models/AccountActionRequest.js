const mongoose = require('mongoose');

// Une demande d'action sur son propre compte (masquer temporairement,
// fermer, ou supprimer définitivement) — jamais exécutée immédiatement
// par l'utilisateur lui-même : une vraie demande est envoyée aux comptes
// admin, qui l'examinent et l'appliquent (ou la refusent). Remplace
// l'ancien comportement de suppression immédiate et irréversible qui
// n'impliquait jamais aucune validation.
const accountActionRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Rôle au moment de la demande — utile pour trier les demandes côté
  // admin (client / vendeur / livreur ont des conséquences différentes :
  // une boutique avec des commandes en cours, une livraison assignée...).
  userRole: {
    type: String,
    required: true,
  },
  requestType: {
    type: String,
    enum: ['hide_temporary', 'close', 'delete_permanent'],
    required: true,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewNote: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  // Uniquement pour requestType='hide_temporary' — date limite pour que
  // l'utilisateur se reconnecte lui-même et annule le masquage. Passé ce
  // délai, la demande passe automatiquement à l'examen admin (vérifie
  // l'absence de vol/fraude/arnaque avant de confirmer, une question
  // plus judiciaire qu'automatique — voir accountAction.controller.js).
  selfReconnectDeadline: Date,
}, {
  timestamps: true,
});

accountActionRequestSchema.index({ status: 1, createdAt: -1 });
accountActionRequestSchema.index({ user: 1 });

module.exports = mongoose.model('AccountActionRequest', accountActionRequestSchema);

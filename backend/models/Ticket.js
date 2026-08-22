const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    // Motif à choix — n'existait pas, la demande précise un menu de motifs
    // prédéfinis plutôt qu'un texte libre uniquement.
    motif: {
      type: String,
      enum: [
        'probleme_commande', 'probleme_paiement', 'probleme_livraison',
        'probleme_compte', 'probleme_produit', 'signalement_abus',
        'question_generale', 'suggestion', 'autre',
      ],
      default: 'question_generale',
    },
    message: {
      type: String,
      required: true,
    },
    // Pièces jointes (photo/vidéo/fichier) — n'existaient pas du tout,
    // uniquement du texte était possible jusqu'ici.
    attachments: [
      {
        url: String,
        type: { type: String, enum: ['image', 'video', 'file'] },
        name: String,
      },
    ],
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    responses: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);

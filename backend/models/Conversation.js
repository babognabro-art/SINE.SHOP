const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  // Compteur de non-lus PAR participant — un simple nombre global était
  // partagé entre les deux personnes de la conversation et ne redescendait
  // jamais à zéro (voir controllers/message.controller.js).
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Archivage — par participant, comme les non-lus : archiver une
  // conversation ne l'archive que pour SOI, jamais pour l'autre personne.
  archivedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Suppression de discussion — comme l'archivage, par participant : la
  // retirer de sa propre liste ne la supprime jamais pour l'autre
  // personne, qui continue de la voir et d'y écrire normalement.
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Fond de discussion — par participant (chacun peut choisir le sien,
  // comme sur la plupart des messageries). Une valeur prédéfinie ("preset:
  // ocean") ou l'URL Cloudinary d'une photo importée depuis le téléphone.
  chatBackgrounds: {
    type: Map,
    of: String,
    default: {},
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'support'],
    default: 'direct',
  },
  name: String, // Pour les groupes
  avatar: String, // Pour les groupes
}, {
  timestamps: true,
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ isActive: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;

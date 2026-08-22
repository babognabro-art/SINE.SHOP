const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  attachments: [String],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  // Suppression asymétrique — masquer un message ne le supprime QUE de
  // l'affichage de la personne qui a demandé la suppression. Jamais
  // supprimé pour de vrai côté destinataire, pour des raisons de preuve/
  // sécurité (litige, modération). Le document lui-même n'est jamais
  // effacé de la base par cette voie.
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Modification — autorisée seulement dans les 10 minutes suivant
  // l'envoi (voir message.controller.js:editMessage). L'autre participant
  // doit toujours voir que le message a été modifié.
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  // Transfert — trace le message d'origine, pour un affichage "Transféré"
  // côté destinataire (façon WhatsApp), sans dupliquer son contenu.
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  // Réactions emoji (façon WhatsApp) — un utilisateur ne peut avoir
  // qu'UNE seule réaction active par message (re-réagir remplace la
  // précédente ; réagir avec le même emoji la retire).
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
  }],
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video', 'audio', 'location', 'share'],
    default: 'text',
  },
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

messageSchema.index({ conversation: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
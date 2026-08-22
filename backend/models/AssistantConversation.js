const mongoose = require('mongoose');

/**
 * Modèle AssistantConversation — historique des conversations avec l'assistant IA.
 * Chaque conversation est liée à un utilisateur et contient un historique de messages.
 */
const assistantConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Nouvelle conversation',
    trim: true,
  },
  messages: [
    {
      role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
      },
      content: {
        type: String,
        required: true,
        trim: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      // Métadonnées optionnelles (ex: contexte, commandeId, etc.)
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  ],
  isArchived: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  // Dernier message pour affichage rapide dans la liste
  lastMessage: {
    type: String,
    trim: true,
    default: '',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  // Compteur de messages pour la pagination
  messageCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
assistantConversationSchema.index({ user: 1, updatedAt: -1 });
assistantConversationSchema.index({ user: 1, isArchived: 1 });
assistantConversationSchema.index({ user: 1, isPinned: 1 });

// Middleware pre-save pour mettre à jour lastMessage et messageCount
assistantConversationSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = lastMsg.content || '';
    this.lastMessageAt = lastMsg.timestamp || new Date();
    this.messageCount = this.messages.length;
  }
  next();
});

// Méthode pour ajouter un message
assistantConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata,
  });
  this.lastMessage = content;
  this.lastMessageAt = new Date();
  this.messageCount = this.messages.length;
  return this.save();
};

// Méthode pour obtenir le contexte de la conversation (derniers N messages)
assistantConversationSchema.methods.getContext = function(limit = 10) {
  const messages = this.messages.slice(-limit);
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
};

// Méthode pour vérifier si la conversation est vide
assistantConversationSchema.methods.isEmpty = function() {
  return this.messages.length === 0;
};

const AssistantConversation = mongoose.model('AssistantConversation', assistantConversationSchema);

module.exports = AssistantConversation;
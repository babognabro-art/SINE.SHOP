const mongoose = require('mongoose');

// Base de connaissances de l'assistant — remplace l'ancienne chaîne de
// 6-7 if/else par mot-clé (services/ai.service.js), qui ne pouvait
// raisonnablement couvrir qu'une poignée de sujets. Conçue pour monter en
// charge vers une très large couverture (des centaines d'entrées, tous
// rôles et tous sujets confondus), avec une recherche par pertinence
// plutôt qu'une simple correspondance exacte de mot-clé.
const faqEntrySchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: [
      'achat', 'vente', 'livraison', 'paiement', 'compte',
      'kyc', 'affiliation', 'messagerie', 'litiges', 'legal', 'general',
    ],
    required: true,
    index: true,
  },
  // Rôle concerné — 'all' si la question s'applique à tout le monde,
  // sinon restreinte à un espace précis (ex: une question vendeur n'a pas
  // à apparaître dans les suggestions d'un client).
  role: {
    type: String,
    enum: ['all', 'client', 'seller', 'livreur', 'affiliate'],
    default: 'all',
  },
  // Mots/expressions supplémentaires qui doivent aussi déclencher cette
  // réponse, au-delà des mots déjà présents dans la question elle-même
  // (synonymes, formulations alternatives, fautes courantes...).
  keywords: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  // Questions liées suggérées après affichage de la réponse — permet à
  // chaque réponse de donner lieu à une vraie conversation qui continue,
  // plutôt qu'une simple question/réponse isolée.
  relatedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaqEntry',
  }],
  views: {
    type: Number,
    default: 0,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  notHelpfulCount: {
    type: Number,
    default: 0,
  },
  // Ordre d'affichage au sein d'une catégorie (navigation par catégorie,
  // pas seulement par recherche).
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index texte MongoDB — recherche par pertinence sur la question, la
// réponse et les mots-clés en une seule requête, avec pondération (la
// question compte plus que le corps de la réponse).
faqEntrySchema.index(
  { question: 'text', answer: 'text', keywords: 'text' },
  { weights: { question: 10, keywords: 8, answer: 3 }, default_language: 'french' }
);
faqEntrySchema.index({ category: 1, order: 1 });

module.exports = mongoose.model('FaqEntry', faqEntrySchema);

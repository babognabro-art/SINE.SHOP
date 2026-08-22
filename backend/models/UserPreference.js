const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  personality: {
    // Personnalité de l'AI pour cet utilisateur
    tone: { type: String, enum: ['professional', 'casual', 'warm', 'humorous'], default: 'warm' },
    formality: { type: Number, min: 0, max: 1, default: 0.6 },
    empathy: { type: Number, min: 0, max: 1, default: 0.7 }
  },
  preferences: {
    categories: [String], // catégories de produits préférées
    brands: [String],     // marques préférées
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: Infinity },
    deliveryPreference: { type: String, enum: ['standard', 'express'], default: 'standard' },
    paymentPreference: { type: String, enum: ['wave', 'mtn', 'orange', 'paypal', 'bank'], default: 'wave' }
  },
  memories: [{
    topic: String,
    summary: String,
    importance: Number,
    lastMentioned: Date,
    count: Number
  }],
  recurringTopics: [{ type: String, index: true }],
  lastInteraction: { type: Date, default: Date.now },
  interactionCount: { type: Number, default: 0 },
  sessionState: {
    currentIntent: String,
    pendingAction: mongoose.Schema.Types.Mixed,
    context: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true, index: true },
  keyPoints: [String],
  embedding: { type: [Number], index: 'vector' }, // Vector pour recherche sémantique
  importance: { type: Number, default: 1, min: 0, max: 10 }, // 1 = basique, 10 = critique
  source: { type: String, enum: ['user', 'ai', 'system', 'order', 'product'] },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    conversationId: String,
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
    resolved: { type: Boolean, default: false }
  },
  expiresAt: { type: Date, default: null } // null = permanent
});

memorySchema.index({ user: 1, topic: 1 });
memorySchema.index({ embedding: 'vector' });

module.exports = mongoose.model('Memory', memorySchema);
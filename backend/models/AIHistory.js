const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conversationId: {
    type: String,
    required: true,
  },
  query: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  context: {
    type: Map,
    of: String,
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo',
  },
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number,
  },
  type: {
    type: String,
    enum: ['chat', 'search', 'recommendation', 'assistance'],
    default: 'chat',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  feedback: String,
  archived: {
    type: Boolean,
    default: false,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

aiHistorySchema.index({ user: 1 });
aiHistorySchema.index({ createdAt: -1 });
aiHistorySchema.index({ type: 1 });
aiHistorySchema.index({ conversationId: 1 });

const AIHistory = mongoose.model('AIHistory', aiHistorySchema);
module.exports = AIHistory;
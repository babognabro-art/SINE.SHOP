const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
  loyaltyWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoyaltyWallet',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['cashback_earned', 'redeemed', 'admin_adjustment', 'expired'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  description: String,
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

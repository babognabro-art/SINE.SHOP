// models/CurrencyRate.model.js
const mongoose = require('mongoose');

const currencyRateSchema = new mongoose.Schema(
  {
    baseCurrency: {
      type: String,
      default: 'XOF',
    },
    rates: {
      EUR: Number,
      USD: Number,
      GBP: Number,
      NGN: Number,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['manual', 'api', 'cron'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Index pour récupérer le taux le plus récent
currencyRateSchema.index({ createdAt: -1 });

const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);
module.exports = CurrencyRate;
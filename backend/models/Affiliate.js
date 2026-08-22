const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  commissionRate: {
    type: Number,
    default: 10,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalCommission: {
    type: Number,
    default: 0,
  },
  referrals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Commande à l'origine de cette commission — absent pour le bonus fixe
    // d'inscription (referredBy sur User), renseigné pour une commission
    // sur achat (voir services/affiliate.service.js) afin d'éviter de
    // créditer deux fois la même commande.
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    orderTotal: Number,
    commission: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  // Coordonnées de paiement pour les retraits — référencées par le
  // formulaire de profil (sineshopaffiliation.html) mais absentes jusqu'ici.
  payoutMethods: {
    mtn: String,
    orange: String,
    wave: String,
    paypal: String,
  },
  lastWithdrawAt: Date,
  stats: {
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

affiliateSchema.index({ code: 1 });
affiliateSchema.index({ status: 1 });

// Method to calculate conversion rate
affiliateSchema.methods.calculateConversionRate = function() {
  if (this.stats.clicks === 0) return 0;
  this.stats.conversionRate = (this.stats.conversions / this.stats.clicks) * 100;
  return this.stats.conversionRate;
};

const Affiliate = mongoose.model('Affiliate', affiliateSchema);
module.exports = Affiliate;
const mongoose = require('mongoose');

// =====================================================
// CONFIGURATION FINANCIÈRE — document unique (singleton), modifiable
// depuis admin-finance.html. Remplace les valeurs codées en dur trouvées
// dans le backend (ex: SELLER_COMMISSION_RATE=5 en dur dans
// seller-payment.controller.js) — si la commission change dans 6 mois,
// on modifie cette configuration, jamais le code.
// =====================================================
const financeConfigSchema = new mongoose.Schema({
  singleton: {
    type: String,
    default: 'finance-config',
    unique: true,
  },
  marketplaceCommissionRate: {
    type: Number,
    default: 5, // % — taux par défaut, appliqué si aucune catégorie n'a de taux spécifique ci-dessous
  },
  // Taux de commission par catégorie de produit — permet de descendre à
  // 2-4% sur les catégories à faible marge, ou de monter sur d'autres,
  // sans jamais coder ces valeurs en dur (demande explicite : "prévoir
  // des taux de commission par catégorie, ex. 3%, 5%, 8%"). Clé = nom de
  // catégorie (Product.category), valeur = taux en %. Une catégorie
  // absente de cette Map utilise marketplaceCommissionRate par défaut.
  categoryCommissionRates: {
    type: Map,
    of: Number,
    default: {},
  },
  deliveryCommissionRate: {
    type: Number,
    default: 0, // % — 0 = le livreur garde 100% des frais de livraison
  },
  loyaltyCashbackMaxRate: {
    type: Number,
    default: 0.40, // % — plafond du taux de cashback, palier "premium"
  },
  loyaltyMaxUsagePerOrder: {
    type: Number,
    default: 0.20, // % du montant de la commande, maximum utilisable en fidélité
  },
  sellerPayoutDelayHours: {
    type: Number,
    default: 72, // délai avant déblocage des fonds au vendeur après livraison
  },
  minWithdrawalSeller: {
    type: Number,
    default: 10000, // FCFA
  },
  minWithdrawalAffiliate: {
    type: Number,
    default: 65000, // FCFA — valeur réelle déjà en place avant la Phase 2 (affiliate.controller.js), pas une nouvelle règle
  },
  minWithdrawalLivreur: {
    type: Number,
    default: 5000, // FCFA
  },
  // Lien de paiement marchand Wave Business (format public
  // https://pay.wave.com/m/...) — PAS une clé API, un lien public sans
  // danger à stocker en base. Sert uniquement de repli/secours manuel
  // (ex: un vendeur qui veut être payé directement sans passer par le
  // flux commande) — le vrai SCAN PAY par commande (scanPay.controller.js)
  // n'en a pas besoin, il génère son propre lien signé par commande, plus
  // sûr car toujours rattaché à une commande précise dans le backend.
  waveBusinessPublicLink: {
    type: String,
    default: 'https://pay.wave.com/m/M_ci_xk8zf44edyFe/c/ci/',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

financeConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ singleton: 'finance-config' });
  if (!config) {
    config = await this.create({ singleton: 'finance-config' });
  }
  return config;
};

module.exports = mongoose.model('FinanceConfig', financeConfigSchema);

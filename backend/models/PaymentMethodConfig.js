const mongoose = require('mongoose');

// =====================================================
// PRESTATAIRES DE PAIEMENT — un seul document par prestataire, avec un
// simple interrupteur `enabled`. Permet d'afficher "🔒 Indisponible" sur
// Orange/MTN dès maintenant sans construire leur intégration, puis de les
// activer d'un clic depuis admin-finance.html dès que les clés API sont
// obtenues — SANS jamais retoucher le code frontend ni redéployer.
// =====================================================
const paymentMethodConfigSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['wave', 'orange_money', 'mtn_money', 'card', 'sine_wallet', 'cash_on_delivery'],
    required: true,
    unique: true,
  },
  label: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  // Rempli seulement une fois les vraies clés obtenues — jamais commité en
  // clair, toujours via variables d'environnement au moment du déploiement.
  configuredAt: Date,
}, { timestamps: true });

// Amorce les 6 prestataires prévus s'ils n'existent pas encore.
// Wave : activé par défaut dès qu'un lien de paiement direct (public,
// https://pay.wave.com/m/...) est configuré — ce mode simple ne nécessite
// PAS les clés API Checkout complètes, seulement le lien marchand public.
// La confirmation de paiement reste alors manuelle (pas de webhook tant
// que l'API complète n'est pas branchée) — voir sinepay.html.
paymentMethodConfigSchema.statics.ensureDefaults = async function () {
  const FinanceConfig = require('./FinanceConfig');
  const config = await FinanceConfig.getConfig();
  const waveDirectLinkReady = !!config.waveBusinessPublicLink;

  const defaults = [
    { provider: 'sine_wallet', label: 'Mon portefeuille SINE.SHOP', enabled: true },
    { provider: 'wave', label: 'Wave', enabled: waveDirectLinkReady },
    { provider: 'orange_money', label: 'Orange Money', enabled: false },
    { provider: 'mtn_money', label: 'MTN MoMo', enabled: false },
    { provider: 'card', label: 'Carte bancaire', enabled: false },
    { provider: 'cash_on_delivery', label: 'Paiement à la livraison', enabled: true },
  ];
  for (const d of defaults) {
    await this.updateOne({ provider: d.provider }, { $setOnInsert: d }, { upsert: true });
  }

  // Synchronise avec les interrupteurs .env (WAVE_ENABLED, etc.) — SOURCE
  // DE VÉRITÉ pour la disponibilité technique réelle. Wave a DEUX modes
  // possibles : lien direct (juste besoin du lien public — c'est le mode
  // actif maintenant) OU API Checkout complète (nécessite WAVE_API_KEY,
  // pour plus tard). Orange/MTN n'ont qu'un seul mode, l'API complète.
  const envFlags = {
    wave: waveDirectLinkReady || (process.env.WAVE_ENABLED === 'true' && !!process.env.WAVE_API_KEY),
    orange_money: process.env.ORANGE_MONEY_ENABLED === 'true' && !!process.env.ORANGE_CLIENT_ID,
    mtn_money: process.env.MTN_ENABLED === 'true' && !!process.env.MTN_API_KEY,
    card: process.env.CARD_PAYMENT_ENABLED === 'true' && !!process.env.CARD_PAYMENT_PUBLIC_KEY,
  };
  for (const [provider, technicallyReady] of Object.entries(envFlags)) {
    if (!technicallyReady) {
      // Force la désactivation si rien n'est prêt, quelle que soit la
      // valeur en base — empêche un admin d'activer par erreur un
      // prestataire dont les clés/liens ne sont pas réellement configurés.
      await this.updateOne({ provider, enabled: true }, { enabled: false });
    } else if (provider === 'wave' && waveDirectLinkReady) {
      // Réactive automatiquement Wave si le lien direct est prêt, même si
      // quelqu'un l'avait désactivé manuellement par erreur — cohérent
      // avec "Wave = actif maintenant" confirmé par l'utilisateur.
      await this.updateOne({ provider: 'wave', enabled: false }, { enabled: true });
    }
  }
};

module.exports = mongoose.model('PaymentMethodConfig', paymentMethodConfigSchema);

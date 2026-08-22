const PaymentMethodConfig = require('../models/PaymentMethodConfig');
const FinanceConfig = require('../models/FinanceConfig');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');

// GET /api/payment-methods — PUBLIC. Renvoie l'état actuel de chaque
// prestataire (activé/désactivé) — le frontend (sinepay.html,
// client.html) affiche "🔒 Indisponible" pour tout prestataire désactivé,
// sans jamais coder ça en dur : le jour où Wave/Orange/MTN sont
// réellement activés côté admin-finance.html, le bouton apparaît
// automatiquement partout, sans toucher au code.
const getPaymentMethods = asyncHandler(async (req, res) => {
  await PaymentMethodConfig.ensureDefaults();
  const methods = await PaymentMethodConfig.find().select('provider label enabled');

  // Le lien Wave direct est renvoyé UNIQUEMENT pour ce prestataire — c'est
  // un lien public (pas une clé secrète), sans danger à exposer côté
  // client, indispensable pour que le bouton "Payer avec Wave" sache où
  // rediriger.
  const config = await FinanceConfig.getConfig();
  const enriched = methods.map((m) => {
    const obj = m.toObject();
    if (m.provider === 'wave') obj.waveLink = config.waveBusinessPublicLink || null;
    return obj;
  });

  sendSuccess(res, enriched);
});

module.exports = { getPaymentMethods };

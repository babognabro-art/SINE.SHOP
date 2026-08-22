const FinancialLedger = require('../models/FinancialLedger');
const FinanceConfig = require('../models/FinanceConfig');
const PaymentMethodConfig = require('../models/PaymentMethodConfig');
const Withdrawal = require('../models/Withdrawal');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError } = require('../utils/ApiError');

// =====================================================
// TABLEAU DE BORD FINANCE — vue d'ensemble demandée dans admin-finance.html
// (paiements du jour, commissions, fonds en attente, retraits en attente).
// =====================================================
const getFinanceDashboard = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    paymentsToday,
    revenueTodayAgg,
    pendingWithdrawals,
    commissionAgg,
    totalRevenueAgg,
  ] = await Promise.all([
    Payment.countDocuments({ status: 'success', createdAt: { $gte: startOfDay } }),
    Payment.aggregate([
      { $match: { status: 'success', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Withdrawal.countDocuments({ status: 'pending' }),
    FinancialLedger.aggregate([
      { $match: { type: 'commission', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  sendSuccess(res, {
    paymentsToday,
    revenueToday: revenueTodayAgg[0]?.total || 0,
    pendingWithdrawals,
    commissionToday: commissionAgg[0]?.total || 0,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
  });
});

// =====================================================
// JOURNAL FINANCIER — consultation, filtrable par type/date, base de tout
// audit et de la réconciliation avec le relevé Wave.
// =====================================================
const getFinancialLedger = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 50, from, to } = req.query;
  const query = {};
  if (type) query.type = type;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const entries = await FinancialLedger.find(query)
    .populate('user', 'firstName lastName email')
    .populate('order', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await FinancialLedger.countDocuments(query);

  sendSuccess(res, {
    entries,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
  });
});

// =====================================================
// CONFIGURATION FINANCIÈRE — LA section "Paramètres" d'admin-finance.html :
// commission marketplace, plafonds fidélité, délais de déblocage vendeur,
// montants minimum de retrait — plus aucune de ces valeurs codée en dur
// dans le backend, tout se modifie ici sans redéploiement.
// =====================================================
const getFinanceConfig = asyncHandler(async (req, res) => {
  const config = await FinanceConfig.getConfig();
  sendSuccess(res, config);
});

const updateFinanceConfig = asyncHandler(async (req, res) => {
  const allowedFields = [
    'marketplaceCommissionRate',
    'deliveryCommissionRate',
    'loyaltyCashbackMaxRate',
    'loyaltyMaxUsagePerOrder',
    'sellerPayoutDelayHours',
    'minWithdrawalSeller',
    'minWithdrawalAffiliate',
    'minWithdrawalLivreur',
  ];

  const config = await FinanceConfig.getConfig();
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      const value = Number(req.body[field]);
      if (Number.isNaN(value) || value < 0) {
        throw new BadRequestError(`Valeur invalide pour ${field}.`);
      }
      config[field] = value;
    }
  });

  // Lien de paiement marchand Wave Business — champ texte, pas un nombre.
  if (req.body.waveBusinessPublicLink !== undefined) {
    config.waveBusinessPublicLink = String(req.body.waveBusinessPublicLink).trim();
  }

  // Taux de commission par catégorie — objet simple {catégorie: taux},
  // converti en Map Mongoose. Remplace entièrement la Map existante
  // (cohérent avec la façon dont admin-finance.html envoie l'état complet
  // à chaque modification, pas une fusion partielle).
  if (req.body.categoryCommissionRates && typeof req.body.categoryCommissionRates === 'object') {
    const entries = Object.entries(req.body.categoryCommissionRates);
    for (const [, rate] of entries) {
      if (Number.isNaN(Number(rate)) || Number(rate) < 0) {
        throw new BadRequestError('Taux de commission par catégorie invalide.');
      }
    }
    config.categoryCommissionRates = new Map(entries.map(([cat, rate]) => [cat, Number(rate)]));
  }

  config.updatedBy = req.user.id;
  await config.save();

  sendSuccess(res, config, 'Configuration financière mise à jour.');
});

// =====================================================
// PRESTATAIRES DE PAIEMENT — activer/désactiver Wave/Orange/MTN/Carte
// sans toucher au code (voir PaymentMethodConfig.js).
// =====================================================
const listPaymentMethodsAdmin = asyncHandler(async (req, res) => {
  await PaymentMethodConfig.ensureDefaults();
  const methods = await PaymentMethodConfig.find().sort({ provider: 1 });
  sendSuccess(res, methods);
});

const togglePaymentMethod = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const method = await PaymentMethodConfig.findOne({ provider: req.params.provider });
  if (!method) throw new NotFoundError('Prestataire introuvable.');

  // Empêche d'activer un prestataire dont les vraies clés API ne sont pas
  // configurées dans .env — évite un état incohérent où l'interface
  // affiche "activé" mais où aucun paiement réel ne pourrait jamais
  // aboutir. Le wallet et le paiement à la livraison ne dépendent
  // d'aucune clé externe, jamais concernés par cette vérification. Wave a
  // deux modes : lien direct (juste besoin du lien public, déjà prêt) ou
  // API Checkout complète (clé API) — l'un ou l'autre suffit.
  const financeConfig = await FinanceConfig.getConfig();
  const envReadiness = {
    wave: !!financeConfig.waveBusinessPublicLink || (process.env.WAVE_ENABLED === 'true' && !!process.env.WAVE_API_KEY),
    orange_money: process.env.ORANGE_MONEY_ENABLED === 'true' && !!process.env.ORANGE_CLIENT_ID,
    mtn_money: process.env.MTN_ENABLED === 'true' && !!process.env.MTN_API_KEY,
    card: process.env.CARD_PAYMENT_ENABLED === 'true' && !!process.env.CARD_PAYMENT_PUBLIC_KEY,
  };
  if (enabled && envReadiness[method.provider] === false) {
    throw new BadRequestError(`${method.label} ne peut pas être activé : les clés API ne sont pas encore configurées sur le serveur (.env).`);
  }

  method.enabled = !!enabled;
  if (enabled) method.configuredAt = new Date();
  await method.save();

  sendSuccess(res, method, `${method.label} ${enabled ? 'activé' : 'désactivé'}.`);
});

// =====================================================
// REMBOURSEMENTS
// =====================================================
const listRefunds = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  const query = {};
  if (status) query.status = status;

  const refunds = await Refund.find(query)
    .populate('user', 'firstName lastName email')
    .populate('order', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Refund.countDocuments(query);

  sendSuccess(res, {
    refunds,
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
  });
});

// Crée une demande de remboursement — le traitement effectif (webhook
// Wave de remboursement) sera branché en Phase 1/3 une fois les clés API
// obtenues ; pour l'instant, structure complète prête, statut "pending".
const createRefund = asyncHandler(async (req, res) => {
  const { paymentId, amount, reason } = req.body;
  if (!paymentId || !amount || !reason) {
    throw new BadRequestError('paymentId, amount et reason sont requis.');
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) throw new NotFoundError('Paiement introuvable.');
  if (amount > payment.amount) throw new BadRequestError('Le montant dépasse le paiement d\'origine.');

  const refund = await Refund.create({
    payment: payment._id,
    order: payment.order,
    user: payment.user,
    amount,
    currency: payment.currency,
    reason,
    requestedBy: req.user.id,
  });

  sendCreated(res, refund, 'Demande de remboursement créée.');
});

const updateRefundStatus = asyncHandler(async (req, res) => {
  const { status, refundTransactionId } = req.body;
  if (!['processing', 'completed', 'failed'].includes(status)) {
    throw new BadRequestError('Statut invalide.');
  }

  const refund = await Refund.findById(req.params.id);
  if (!refund) throw new NotFoundError('Remboursement introuvable.');

  refund.status = status;
  if (refundTransactionId) refund.refundTransactionId = refundTransactionId;
  if (status === 'completed') {
    refund.processedAt = new Date();

    // Répercute sur le paiement d'origine (compatibilité avec les champs
    // déjà existants sur Payment.js) + trace dans le journal financier.
    const payment = await Payment.findById(refund.payment);
    if (payment) {
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.refundAmount = refund.amount;
      await payment.save();
    }

    const { recordLedgerEntry } = require('../services/ledger.service');
    await recordLedgerEntry({
      type: 'refund',
      direction: 'debit',
      amount: refund.amount,
      order: refund.order,
      user: refund.user,
      providerTransactionId: refund.refundTransactionId,
      description: `Remboursement — ${refund.reason}`,
    });
  }
  await refund.save();

  sendSuccess(res, refund, 'Statut du remboursement mis à jour.');
});

module.exports = {
  getFinanceDashboard,
  getFinancialLedger,
  getFinanceConfig,
  updateFinanceConfig,
  listPaymentMethodsAdmin,
  togglePaymentMethod,
  listRefunds,
  createRefund,
  updateRefundStatus,
};

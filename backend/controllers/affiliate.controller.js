const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const FinanceConfig = require('../models/FinanceConfig');
const { recordLedgerEntry } = require('../services/ledger.service');
const EmailService = require('../services/email.service');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const { generateAffiliateCode } = require('../utils/generateToken');

// Règles de retrait — mêmes seuils que ceux déjà utilisés côté frontend
// (sineshopaffiliation.html), maintenant appliqués aussi côté serveur.
// MIN_WITHDRAW migré vers FinanceConfig.minWithdrawalAffiliate (Phase 2 —
// modifiable depuis admin-finance.html sans redéploiement). Les autres
// règles ci-dessous sont des critères d'ÉLIGIBILITÉ propres à
// l'affiliation (pas de simples montants) — laissées telles quelles pour
// l'instant, plus nuancées que la configuration financière générale.
const MIN_BALANCE_AFTER = 32500;
const MIN_DAYS_ACTIVE = 90;
const MIN_ACTIVE_REFERRALS = 6;
const MAX_WITHDRAW_PERCENT = 0.20;
const WITHDRAW_INTERVAL_DAYS = 15;

async function getAvailableBalance(affiliateId) {
  const withdrawals = await Withdrawal.find({ affiliate: affiliateId, status: { $ne: 'rejected' } });
  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const affiliate = await Affiliate.findById(affiliateId);
  return (affiliate.totalCommission || 0) - withdrawn;
}

const createAffiliate = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Vérifier si l'utilisateur est déjà affilié
  const existingAffiliate = await Affiliate.findOne({ user: user._id });
  if (existingAffiliate) {
    throw new BadRequestError('User is already an affiliate');
  }

  const affiliate = await Affiliate.create({
    user: user._id,
    code: generateAffiliateCode(),
    commissionRate: 10,
  });

  user.role = 'affiliate';
  await user.save();

  sendSuccess(res, affiliate, 'Affiliate account created successfully');
});

const getAffiliateStats = asyncHandler(async (req, res) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  const balance = await getAvailableBalance(affiliate._id);

  sendSuccess(res, { ...affiliate.toObject(), balance }, 'Affiliate statistics retrieved successfully');
});

const getAffiliateByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const affiliate = await Affiliate.findOne({ code })
    .populate('user', 'firstName lastName storeName');

  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  sendSuccess(res, affiliate, 'Affiliate retrieved successfully');
});

const trackReferral = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { orderId } = req.body;

  const affiliate = await Affiliate.findOne({ code });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const commission = (order.total * affiliate.commissionRate) / 100;

  affiliate.referrals.push({
    user: order.user,
    orderTotal: order.total,
    commission,
    status: 'pending',
  });

  affiliate.totalSales += order.total;
  affiliate.totalCommission += commission;
  affiliate.stats.conversions += 1;
  affiliate.calculateConversionRate();

  await affiliate.save();

  sendSuccess(res, affiliate, 'Referral tracked successfully');
});

const getReferrals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const affiliate = await Affiliate.findOne({ user: req.user.id })
    .populate('referrals.user', 'firstName lastName email');
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  let referrals = affiliate.referrals;
  if (status) {
    referrals = referrals.filter(r => r.status === status);
  }

  const total = referrals.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  sendSuccess(res, {
    referrals: referrals.slice(start, end),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Referrals retrieved successfully');
});

const updateCommissionRate = asyncHandler(async (req, res) => {
  const { rate } = req.body;

  if (rate < 0 || rate > 50) {
    throw new BadRequestError('Commission rate must be between 0 and 50');
  }

  const affiliate = await Affiliate.findOne({ user: req.user.id });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  affiliate.commissionRate = rate;
  await affiliate.save();

  sendSuccess(res, affiliate, 'Commission rate updated successfully');
});

// Enregistrer/mettre à jour les coordonnées de paiement (MTN, Orange, Wave, PayPal)
const updatePayoutMethods = asyncHandler(async (req, res) => {
  const { mtn, orange, wave, paypal } = req.body;

  const affiliate = await Affiliate.findOne({ user: req.user.id });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  affiliate.payoutMethods = {
    mtn: mtn ?? affiliate.payoutMethods?.mtn,
    orange: orange ?? affiliate.payoutMethods?.orange,
    wave: wave ?? affiliate.payoutMethods?.wave,
    paypal: paypal ?? affiliate.payoutMethods?.paypal,
  };
  await affiliate.save();

  sendSuccess(res, affiliate, 'Payout methods updated successfully');
});

// Demander un retrait — applique les mêmes règles métier que le frontend,
// mais côté serveur cette fois (source de vérité).
const createWithdrawal = asyncHandler(async (req, res) => {
  const { amount, method, account } = req.body;
  const config = await FinanceConfig.getConfig();

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid withdrawal amount');
  }
  if (!method || !account) {
    throw new BadRequestError('Payment method and account are required');
  }
  if (amount < config.minWithdrawalAffiliate) {
    throw new BadRequestError(`Minimum withdrawal amount is ${config.minWithdrawalAffiliate}`);
  }

  const affiliate = await Affiliate.findOne({ user: req.user.id });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  const daysActive = Math.floor((Date.now() - affiliate.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysActive < MIN_DAYS_ACTIVE) {
    throw new BadRequestError(`Account must be active for at least ${MIN_DAYS_ACTIVE} days`);
  }

  const activeReferrals = affiliate.referrals.filter(r => r.status !== 'cancelled').length;
  if (activeReferrals < MIN_ACTIVE_REFERRALS) {
    throw new BadRequestError(`At least ${MIN_ACTIVE_REFERRALS} active referrals required`);
  }

  if (affiliate.lastWithdrawAt) {
    const daysSinceLast = Math.floor((Date.now() - affiliate.lastWithdrawAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast < WITHDRAW_INTERVAL_DAYS) {
      throw new BadRequestError(`Next withdrawal available in ${WITHDRAW_INTERVAL_DAYS - daysSinceLast} days`);
    }
  }

  const balance = await getAvailableBalance(affiliate._id);
  if (amount > balance) {
    throw new BadRequestError('Insufficient balance');
  }

  const maxWithdraw = balance * MAX_WITHDRAW_PERCENT;
  if (amount > maxWithdraw) {
    throw new BadRequestError(`Maximum withdrawal is ${Math.floor(maxWithdraw)} (20% of balance)`);
  }

  if (balance - amount < MIN_BALANCE_AFTER) {
    throw new BadRequestError(`Minimum remaining balance is ${MIN_BALANCE_AFTER}`);
  }

  const withdrawal = await Withdrawal.create({
    affiliate: affiliate._id,
    user: req.user.id,
    amount,
    method,
    account,
    status: 'pending',
  });

  affiliate.lastWithdrawAt = new Date();
  await affiliate.save();

  // Trace dans le journal financier (Phase 2) — la demande elle-même,
  // avant même sa validation, comme sur les retraits vendeur/livreur.
  await recordLedgerEntry({
    type: 'seller_payout_held',
    direction: 'debit',
    amount,
    user: req.user.id,
    provider: method,
    description: 'Demande de retrait affilié en attente de validation',
  });

  // Email de confirmation (affiliation@sineshophome.com) — n'existait pas,
  // l'affilié n'avait aucune confirmation écrite de sa demande de retrait.
  try {
    const affiliateUser = await User.findById(req.user.id);
    if (affiliateUser?.email) {
      await EmailService.sendAffiliationNotification(
        affiliateUser.email,
        affiliateUser.firstName,
        `Votre demande de retrait de ${amount} a bien été reçue et est en cours de traitement. Vous serez notifié dès qu'elle sera payée.`,
        `${amount}`,
        `${await getAvailableBalance(affiliate._id)}`,
        affiliateUser.preferredLanguage
      );
    }
  } catch (mailError) {
    console.error('Error sending withdrawal confirmation email:', mailError);
  }

  sendSuccess(res, withdrawal, 'Withdrawal request created successfully');
});

const getMyWithdrawals = asyncHandler(async (req, res) => {
  const affiliate = await Affiliate.findOne({ user: req.user.id });
  if (!affiliate) {
    throw new NotFoundError('Affiliate not found');
  }

  const withdrawals = await Withdrawal.find({ affiliate: affiliate._id }).sort({ createdAt: -1 });
  const balance = await getAvailableBalance(affiliate._id);

  sendSuccess(res, { withdrawals, balance }, 'Withdrawals retrieved successfully');
});

module.exports = {
  createAffiliate,
  getAffiliateStats,
  getAffiliateByCode,
  trackReferral,
  getReferrals,
  updateCommissionRate,
  updatePayoutMethods,
  createWithdrawal,
  getMyWithdrawals,
};
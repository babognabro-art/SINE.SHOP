const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const FinanceConfig = require('../models/FinanceConfig');
const { recordLedgerEntry } = require('../services/ledger.service');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/ApiError');

// =====================================================
// RETRAIT LIVREUR — construit de A à Z, n'existait NULLE PART dans le
// projet avant ce tour : un livreur pouvait effectuer des livraisons et
// voir des frais de livraison s'accumuler sur chaque commande
// (order.shippingCost), mais AUCUN mécanisme ne lui permettait jamais de
// les retirer — contrairement au vendeur et à l'affilié qui avaient déjà
// leur propre système. Réutilise exactement le même patron (solde
// calculé à la volée, jamais stocké), aucune commission prélevée par
// défaut sur les frais de livraison (deliveryCommissionRate=0 dans
// FinanceConfig — le livreur garde 100% de ses frais, configurable si
// jamais le Boss veut changer ça plus tard).
// =====================================================

async function getGrossEarnings(livreurId) {
  const orders = await Order.find({
    livreur: livreurId,
    status: 'delivered',
    paymentStatus: 'paid',
  });
  return orders.reduce((sum, o) => sum + (o.shippingCost || 0), 0);
}

async function getAvailableBalance(livreurId, deliveryCommissionRate) {
  const gross = await getGrossEarnings(livreurId);
  const net = gross * (1 - deliveryCommissionRate / 100);
  const withdrawals = await Withdrawal.find({
    user: livreurId,
    type: 'livreur',
    status: { $ne: 'rejected' },
  });
  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  return Math.max(0, net - withdrawn);
}

// GET /api/livreurs/balance
const getLivreurBalance = asyncHandler(async (req, res) => {
  const config = await FinanceConfig.getConfig();
  const gross = await getGrossEarnings(req.user.id);
  const commission = gross * (config.deliveryCommissionRate / 100);
  const balance = await getAvailableBalance(req.user.id, config.deliveryCommissionRate);

  sendSuccess(res, {
    grossEarnings: gross,
    commissionRate: config.deliveryCommissionRate,
    commissionDeducted: commission,
    availableBalance: balance,
    minWithdraw: config.minWithdrawalLivreur,
  }, 'Livreur balance retrieved');
});

// POST /api/livreurs/withdraw
const requestLivreurWithdrawal = asyncHandler(async (req, res) => {
  const { amount, method, account } = req.body;
  const config = await FinanceConfig.getConfig();

  if (!amount || !method || !account) {
    throw new BadRequestError('Amount, method and account are required');
  }
  if (amount < config.minWithdrawalLivreur) {
    throw new BadRequestError(`Minimum withdrawal is ${config.minWithdrawalLivreur} FCFA`);
  }

  const balance = await getAvailableBalance(req.user.id, config.deliveryCommissionRate);
  if (amount > balance) {
    throw new BadRequestError('Insufficient balance');
  }

  const withdrawal = await Withdrawal.create({
    type: 'livreur',
    user: req.user.id,
    amount,
    method,
    account,
    status: 'pending',
  });

  await recordLedgerEntry({
    type: 'seller_payout_held',
    direction: 'debit',
    amount,
    user: req.user.id,
    provider: method,
    description: 'Demande de retrait livreur en attente de validation',
  });

  sendCreated(res, withdrawal, 'Withdrawal request submitted');
});

// GET /api/livreurs/withdrawals
const getLivreurWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user.id, type: 'livreur' }).sort({ createdAt: -1 });
  sendSuccess(res, withdrawals, 'Livreur withdrawals retrieved');
});

module.exports = {
  getLivreurBalance,
  requestLivreurWithdrawal,
  getLivreurWithdrawals,
};

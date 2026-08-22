const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const FinanceConfig = require('../models/FinanceConfig');
const FinancialLedger = require('../models/FinancialLedger');
const { recordLedgerEntry } = require('../services/ledger.service');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/ApiError');

// Le solde d'un vendeur n'est jamais stocké directement. Deux choses ont
// changé par rapport à la version précédente :
// 1. La commission n'est plus recalculée avec un taux unique ici — elle
//    est désormais lue TELLE QUELLE dans le journal financier (montants
//    exacts déjà calculés article par article / catégorie par catégorie
//    au moment du paiement, voir paymentSplit.service.js) — une seule
//    source de vérité, jamais deux calculs qui pourraient diverger.
// 2. Le délai de sécurité de 72h (configurable) est maintenant VRAIMENT
//    appliqué : une commande livrée depuis moins de 72h reste en "fonds
//    en attente" (héldBalance), pas encore dans le solde disponible.
//    Avant ce correctif, seul le statut "delivered" comptait, sans aucun
//    délai réel malgré la valeur déjà présente dans FinanceConfig.

async function getGrossEarnings(sellerId) {
  const orders = await Order.find({
    seller: sellerId,
    status: 'delivered',
    paymentStatus: 'paid',
  });
  return orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
}

// Sépare les commandes livrées entre "mûres" (délai de sécurité écoulé,
// fonds débloquables) et "encore en attente" (toujours dans le délai).
async function splitMaturedOrders(sellerId, delayHours) {
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);
  const baseQuery = { seller: sellerId, status: 'delivered', paymentStatus: 'paid' };

  const [matured, pending] = await Promise.all([
    Order.find({ ...baseQuery, deliveredAt: { $lte: cutoff } }).select('_id'),
    Order.find({ ...baseQuery, $or: [{ deliveredAt: { $gt: cutoff } }, { deliveredAt: null }] }).select('_id'),
  ]);

  return { maturedIds: matured.map((o) => o._id), pendingIds: pending.map((o) => o._id) };
}

async function sumSellerPayoutHeld(sellerId, orderIds) {
  if (!orderIds.length) return 0;
  const agg = await FinancialLedger.aggregate([
    { $match: { type: 'seller_payout_held', user: sellerId, order: { $in: orderIds } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return agg[0]?.total || 0;
}

// Marque comme "débloquées" (seller_payout_released) les commandes mûres
// qui ne l'ont pas encore été — appelé paresseusement à chaque
// consultation du solde plutôt que via une tâche planifiée dédiée
// (aucune infra de cron confirmée sur ce projet) : suffisant en pratique,
// et strictement idempotent (une commande n'est jamais débloquée deux fois).
async function releaseMaturedPayouts(sellerId, maturedIds) {
  if (!maturedIds.length) return;

  const alreadyReleased = await FinancialLedger.find({
    type: 'seller_payout_released',
    user: sellerId,
    order: { $in: maturedIds },
  }).select('order');
  const releasedSet = new Set(alreadyReleased.map((e) => String(e.order)));

  const toRelease = maturedIds.filter((id) => !releasedSet.has(String(id)));
  if (!toRelease.length) return;

  for (const orderId of toRelease) {
    const heldEntry = await FinancialLedger.findOne({
      type: 'seller_payout_held',
      user: sellerId,
      order: orderId,
    });
    if (!heldEntry) continue;

    await recordLedgerEntry({
      type: 'seller_payout_released',
      direction: 'debit',
      amount: heldEntry.amount,
      order: orderId,
      user: sellerId,
      description: `Déblocage automatique après le délai de sécurité (commande ${orderId})`,
    });
  }
}

async function getAvailableBalance(sellerId, delayHours) {
  const { maturedIds, pendingIds } = await splitMaturedOrders(sellerId, delayHours);
  await releaseMaturedPayouts(sellerId, maturedIds);

  const maturedNet = await sumSellerPayoutHeld(sellerId, maturedIds);
  const heldNet = await sumSellerPayoutHeld(sellerId, pendingIds);

  const withdrawals = await Withdrawal.find({
    user: sellerId,
    type: 'seller',
    status: { $ne: 'rejected' },
  });
  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  return {
    availableBalance: Math.max(0, maturedNet - withdrawn),
    heldBalance: heldNet,
  };
}

// GET /api/seller/balance
const getSellerBalance = asyncHandler(async (req, res) => {
  const config = await FinanceConfig.getConfig();
  const gross = await getGrossEarnings(req.user.id);
  const { availableBalance, heldBalance } = await getAvailableBalance(req.user.id, config.sellerPayoutDelayHours);

  sendSuccess(res, {
    grossEarnings: gross,
    commissionRate: config.marketplaceCommissionRate,
    availableBalance,
    // Fonds en attente — commandes livrées mais toujours dans le délai de
    // sécurité (72h par défaut), pas encore retirables. N'existait pas du
    // tout côté affichage avant ce correctif.
    heldBalance,
    payoutDelayHours: config.sellerPayoutDelayHours,
    minWithdraw: config.minWithdrawalSeller,
  }, 'Seller balance retrieved');
});

// POST /api/seller/withdraw
const requestSellerWithdrawal = asyncHandler(async (req, res) => {
  const { amount, method, account } = req.body;
  const config = await FinanceConfig.getConfig();

  if (!amount || !method || !account) {
    throw new BadRequestError('Amount, method and account are required');
  }
  if (amount < config.minWithdrawalSeller) {
    throw new BadRequestError(`Minimum withdrawal is ${config.minWithdrawalSeller} FCFA`);
  }

  const { availableBalance } = await getAvailableBalance(req.user.id, config.sellerPayoutDelayHours);
  if (amount > availableBalance) {
    throw new BadRequestError('Insufficient balance');
  }

  const withdrawal = await Withdrawal.create({
    type: 'seller',
    user: req.user.id,
    amount,
    method,
    account,
    status: 'pending',
  });

  // Trace immédiate dans le journal — le mouvement d'argent réel (sortie
  // effective) sera lui tracé au moment où l'admin marque le retrait
  // "payé" (voir payoutAdmin.controller.js::markWithdrawalPaid), mais la
  // DEMANDE elle-même mérite déjà une trace pour l'audit.
  await recordLedgerEntry({
    type: 'seller_payout_held',
    direction: 'debit',
    amount,
    user: req.user.id,
    provider: method,
    description: `Demande de retrait vendeur en attente de validation (n'affecte pas le calcul du solde disponible, qui se base sur les commandes livrées — juste une trace de la demande elle-même)`,
  });

  sendCreated(res, withdrawal, 'Withdrawal request submitted');
});

// GET /api/seller/withdrawals
const getSellerWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user.id, type: 'seller' }).sort({ createdAt: -1 });
  sendSuccess(res, withdrawals, 'Seller withdrawals retrieved');
});

module.exports = {
  getSellerBalance,
  requestSellerWithdrawal,
  getSellerWithdrawals,
};

const Order = require('../models/Order');
const WalletTransaction = require('../models/WalletTransaction');
const { getOrCreateWallet, creditWallet, debitWallet } = require('../services/wallet.service');
const { splitOrderGroupPayment } = require('../services/paymentSplit.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/ApiError');

// GET /api/wallet — solde du portefeuille de l'utilisateur connecté.
const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user.id);
  sendSuccess(res, wallet);
});

// POST /api/wallet/pay — paye UNE commande (ou un groupe) avec le
// portefeuille. Tout est vérifié et exécuté ici, côté serveur — jamais
// confiance en un montant envoyé tel quel par le navigateur sans le
// recouper avec la vraie commande en base (voir garde-fous ci-dessous,
// exactement la protection demandée : "le navigateur ne doit jamais
// pouvoir dire wallet_balance = wallet_balance - 18500").
const payWithWallet = asyncHandler(async (req, res) => {
  const { orderId, orderGroup } = req.body;
  if (!orderId && !orderGroup) throw new BadRequestError('orderId ou orderGroup requis.');

  // Récupère la ou les vraies commandes concernées, jamais le montant
  // fourni par le client — le total à payer vient TOUJOURS de la base.
  const orders = orderGroup
    ? await Order.find({ orderGroup, user: req.user.id })
    : await Order.find({ _id: orderId, user: req.user.id });

  if (!orders.length) throw new NotFoundError('Commande introuvable.');
  if (orders.some((o) => o.user.toString() !== req.user.id)) {
    throw new ForbiddenError('Accès refusé.');
  }
  if (orders.some((o) => o.paymentStatus === 'paid')) {
    throw new BadRequestError('Cette commande est déjà payée.');
  }

  const total = orders.reduce((sum, o) => sum + o.total, 0);

  const wallet = await debitWallet({
    userId: req.user.id,
    amount: total,
    type: 'payment',
    order: orders[0]._id,
    orderGroup: orderGroup || orders[0].orderGroup,
    description: `Paiement commande${orders.length > 1 ? 's' : ''} #${orders.map((o) => o.orderNumber).join(', #')}`,
  });

  // Marque les commandes payées — même mécanisme que les autres modes de
  // paiement déjà en place (voir order.controller.js).
  await Order.updateMany(
    { _id: { $in: orders.map((o) => o._id) } },
    { paymentStatus: 'paid', status: 'confirmed' }
  );

  // Même répartition financière que les autres modes de paiement (voir
  // payment.controller.js) — le paiement par wallet ne doit pas être un
  // circuit financier différent, une seule source de vérité pour tous.
  await splitOrderGroupPayment(orders);

  sendSuccess(res, { wallet, paidOrders: orders.map((o) => o._id) }, 'Paiement effectué avec le portefeuille SINE.SHOP.');
});

// POST /api/wallet/credit-manual — réservé à un usage interne/admin pour
// l'instant (aucune vraie recharge Wave/Orange/MTN tant que les clés API
// ne sont pas fournies) — permet de tester/amorcer un wallet manuellement.
// À remplacer par le vrai webhook du prestataire une fois les clés Wave
// obtenues (voir plan en 9 phases : ce endpoint restera utile ensuite
// pour les ajustements manuels du support).
const creditWalletManual = asyncHandler(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || amount <= 0) throw new BadRequestError('userId et amount (positif) requis.');

  const wallet = await creditWallet({
    userId,
    amount,
    type: 'recharge',
    provider: 'admin',
    description: description || `Ajustement manuel par ${req.user.id}`,
  });

  sendSuccess(res, wallet, 'Portefeuille crédité manuellement.');
});

// GET /api/wallet/transactions — historique des mouvements, pour la
// section "Historique" du Wallet côté client (n'existait pas du tout).
const getWalletTransactions = asyncHandler(async (req, res) => {
  const transactions = await WalletTransaction.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);
  sendSuccess(res, transactions);
});

module.exports = { getMyWallet, payWithWallet, creditWalletManual, getWalletTransactions };

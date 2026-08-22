const Order = require('../models/Order');
const { getOrCreateLoyaltyWallet, getMaxRedeemable } = require('../services/loyalty.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError } = require('../utils/ApiError');

// GET /api/loyalty — solde fidélité + palier actuel de l'utilisateur.
const getMyLoyalty = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateLoyaltyWallet(req.user.id);
  const tier = wallet.getCurrentTier();
  sendSuccess(res, {
    balance: wallet.balance,
    validatedPurchases: wallet.validatedPurchases,
    currentTier: tier,
    nextTier: wallet.constructor.TIERS.find((t) => t.minPurchases > wallet.validatedPurchases) || null,
  });
});

// GET /api/loyalty/preview/:orderId — combien de fidélité peut être
// utilisée sur CETTE commande précise, sans encore rien débiter (aperçu
// affiché avant validation du paiement, voir sinepay.html).
const previewRedeemable = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
  if (!order) throw new NotFoundError('Commande introuvable.');

  const wallet = await getOrCreateLoyaltyWallet(req.user.id);
  const maxRedeemable = await getMaxRedeemable(order.total);
  const usable = Math.min(maxRedeemable, wallet.balance);

  sendSuccess(res, {
    orderTotal: order.total,
    loyaltyBalance: wallet.balance,
    maxRedeemable,
    usable,
    finalTotal: order.total - usable,
  });
});

module.exports = { getMyLoyalty, previewRedeemable };

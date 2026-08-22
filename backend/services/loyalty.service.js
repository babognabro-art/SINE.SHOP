const mongoose = require('mongoose');
const LoyaltyWallet = require('../models/LoyaltyWallet');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const FinanceConfig = require('../models/FinanceConfig');
const { recordLedgerEntry } = require('./ledger.service');
const { BadRequestError } = require('../utils/ApiError');

async function getOrCreateLoyaltyWallet(userId) {
  let wallet = await LoyaltyWallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await LoyaltyWallet.create({ user: userId });
  }
  return wallet;
}

// Montant maximum utilisable en fidélité pour une commande donnée — 0,2%
// du total par défaut (configurable), et JAMAIS 100% de la commande même
// si le solde le permettrait, comme demandé explicitement.
async function getMaxRedeemable(orderTotal) {
  const config = await FinanceConfig.getConfig();
  const cap = Math.floor(orderTotal * (config.loyaltyMaxUsagePerOrder / 100));
  // Garde-fou supplémentaire : jamais plus de 90% de la commande, même si
  // un jour la configuration était mal réglée à une valeur trop haute.
  return Math.min(cap, Math.floor(orderTotal * 0.9));
}

// Applique une réduction fidélité — débite le solde fidélité, ne rembourse
// jamais, ne peut jamais dépasser le plafond calculé ci-dessus.
async function redeemLoyalty({ userId, orderTotal, requestedAmount, order, orderGroup }) {
  const maxRedeemable = await getMaxRedeemable(orderTotal);
  const amount = Math.min(requestedAmount, maxRedeemable);
  if (amount <= 0) return { applied: 0 };

  const session = await mongoose.startSession();
  try {
    let wallet;
    await session.withTransaction(async () => {
      wallet = await LoyaltyWallet.findOneAndUpdate(
        { user: userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!wallet) throw new BadRequestError('Solde fidélité insuffisant.');

      await LoyaltyTransaction.create([{
        loyaltyWallet: wallet._id,
        user: userId,
        type: 'redeemed',
        direction: 'debit',
        amount,
        balanceAfter: wallet.balance,
        order,
        description: `Réduction appliquée sur commande${orderGroup ? ` (groupe ${orderGroup})` : ''}`,
      }], { session });
    });

    await recordLedgerEntry({
      type: 'loyalty_redeemed',
      direction: 'debit',
      amount,
      order,
      orderGroup,
      user: userId,
      description: 'Fidélité utilisée pour réduire une commande',
    });

    return { applied: amount };
  } finally {
    session.endSession();
  }
}

// Crédite le cashback fidélité après un paiement confirmé — taux basé sur
// le palier actuel de l'utilisateur (voir LoyaltyWallet.getCurrentTier),
// incrémente aussi le compteur d'achats validés qui détermine ce palier.
async function creditCashback({ userId, orderTotal, order, eligibleProvider = true }) {
  if (!eligibleProvider || orderTotal <= 0) return { credited: 0 };

  const session = await mongoose.startSession();
  try {
    let wallet;
    let creditedAmount = 0;
    await session.withTransaction(async () => {
      wallet = await LoyaltyWallet.findOne({ user: userId }).session(session);
      if (!wallet) {
        wallet = (await LoyaltyWallet.create([{ user: userId }], { session }))[0];
      }
      const tier = wallet.getCurrentTier();
      creditedAmount = Math.round(orderTotal * (tier.rate / 100));

      wallet.balance += creditedAmount;
      wallet.validatedPurchases += 1;
      await wallet.save({ session });

      if (creditedAmount > 0) {
        await LoyaltyTransaction.create([{
          loyaltyWallet: wallet._id,
          user: userId,
          type: 'cashback_earned',
          direction: 'credit',
          amount: creditedAmount,
          balanceAfter: wallet.balance,
          order,
          description: `Cashback fidélité palier "${tier.name}" (${tier.rate}%)`,
        }], { session });
      }
    });

    if (creditedAmount > 0) {
      await recordLedgerEntry({
        type: 'loyalty_credit',
        direction: 'debit', // sort de la trésorerie SINE.SHOP au bénéfice du client
        amount: creditedAmount,
        order,
        user: userId,
        description: 'Cashback fidélité crédité',
      });
    }

    return { credited: creditedAmount };
  } finally {
    session.endSession();
  }
}

module.exports = { getOrCreateLoyaltyWallet, getMaxRedeemable, redeemLoyalty, creditCashback };

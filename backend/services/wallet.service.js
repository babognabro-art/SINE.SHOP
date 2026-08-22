const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { recordLedgerEntry } = require('./ledger.service');
const { BadRequestError } = require('../utils/ApiError');

// =====================================================
// SERVICE WALLET — point d'entrée UNIQUE pour toucher au solde d'un
// portefeuille. Aucune route ne modifie jamais `wallet.balance`
// directement : tout passe par creditWallet/debitWallet ici, qui
// écrivent systématiquement une WalletTransaction ET une entrée du
// journal financier en même temps que le solde change — jamais l'un
// sans l'autre. C'est la garde-fou explicitement demandée : "le
// navigateur ne doit jamais pouvoir dire wallet_balance = wallet_balance
// - 18500", tout se décide et s'exécute ici, côté serveur.
//
// ⚠️ Utilise des transactions MongoDB (session.withTransaction) pour que
// la mise à jour du solde et l'écriture de la transaction soient
// atomiques (les deux réussissent, ou aucune) — nécessite un MongoDB en
// replica set (le cas par défaut sur MongoDB Atlas, y compris les
// clusters gratuits/partagés). Si jamais la base tourne en standalone
// pur, ces appels échoueront — à vérifier avant mise en production de
// cette phase.
// =====================================================

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0 });
  }
  return wallet;
}

async function creditWallet({ userId, amount, type, provider, providerTransactionId, order, orderGroup, description }) {
  if (amount <= 0) throw new BadRequestError('Montant invalide.');

  const session = await mongoose.startSession();
  try {
    let wallet;
    await session.withTransaction(async () => {
      wallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: amount }, $setOnInsert: { user: userId } },
        { new: true, upsert: true, session }
      );
      await WalletTransaction.create([{
        wallet: wallet._id,
        user: userId,
        type,
        direction: 'credit',
        amount,
        balanceAfter: wallet.balance,
        provider,
        providerTransactionId,
        order,
        orderGroup,
        description,
      }], { session });
    });

    await recordLedgerEntry({
      type: type === 'recharge' ? 'wallet_recharge' : 'wallet_payment',
      direction: 'credit',
      amount,
      order,
      orderGroup,
      user: userId,
      provider,
      providerTransactionId,
      description,
    });

    return wallet;
  } finally {
    session.endSession();
  }
}

async function debitWallet({ userId, amount, type = 'payment', order, orderGroup, description }) {
  if (amount <= 0) throw new BadRequestError('Montant invalide.');

  const session = await mongoose.startSession();
  try {
    let wallet;
    await session.withTransaction(async () => {
      // Vérification ET débit dans la MÊME opération atomique (le filtre
      // `balance: { $gte: amount }` empêche tout solde négatif même en cas
      // de deux paiements simultanés sur le même wallet) — plus fiable
      // qu'un "lire le solde puis vérifier puis écrire" en JS classique.
      wallet = await Wallet.findOneAndUpdate(
        { user: userId, balance: { $gte: amount }, isLocked: { $ne: true } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!wallet) {
        throw new BadRequestError('Solde du portefeuille insuffisant ou compte verrouillé.');
      }
      await WalletTransaction.create([{
        wallet: wallet._id,
        user: userId,
        type,
        direction: 'debit',
        amount,
        balanceAfter: wallet.balance,
        provider: 'sine_wallet',
        order,
        orderGroup,
        description,
      }], { session });
    });

    await recordLedgerEntry({
      type: 'wallet_payment',
      direction: 'debit',
      amount,
      order,
      orderGroup,
      user: userId,
      provider: 'sine_wallet',
      description,
    });

    return wallet;
  } finally {
    session.endSession();
  }
}

module.exports = { getOrCreateWallet, creditWallet, debitWallet };

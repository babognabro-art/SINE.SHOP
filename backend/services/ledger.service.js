const FinancialLedger = require('../models/FinancialLedger');
const logger = require('../utils/logger');

// Compteur simple basé sur le nombre d'entrées existantes — suffisant pour
// le volume de SINE.SHOP, largement plus lisible que des ObjectId bruts
// dans un audit (FIN-000001, FIN-000002...).
async function nextReference() {
  const count = await FinancialLedger.countDocuments();
  return `FIN-${String(count + 1).padStart(6, '0')}`;
}

// Enregistre une entrée dans le journal financier — appelé par tous les
// services qui déplacent réellement de l'argent (wallet, loyalty,
// commission, payout, remboursement...). Ne doit jamais faire échouer
// l'opération principale : une erreur ici est journalisée mais avalée.
async function recordLedgerEntry({
  type,
  direction,
  amount,
  currency = 'XOF',
  order = null,
  orderGroup = null,
  user = null,
  provider = null,
  providerTransactionId = null,
  description = '',
}) {
  try {
    const reference = await nextReference();
    return await FinancialLedger.create({
      reference,
      type,
      direction,
      amount,
      currency,
      order,
      orderGroup,
      user,
      provider,
      providerTransactionId,
      description,
    });
  } catch (error) {
    logger.error('Error recording financial ledger entry:', error);
    return null;
  }
}

module.exports = { recordLedgerEntry };

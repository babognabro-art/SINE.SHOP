const Product = require('../models/Product');
const FinanceConfig = require('../models/FinanceConfig');
const { recordLedgerEntry } = require('./ledger.service');
const logger = require('../utils/logger');

// =====================================================
// RÉPARTITION FINANCIÈRE — le vrai cœur manquant du moteur financier,
// exactement le schéma demandé :
//
//   COMMANDE → PAIEMENT → RÉPARTITION (vendeur 1, vendeur 2, ..., livreur,
//   SINE.SHOP) → FONDS EN ATTENTE → DÉBLOCAGE (après le délai configuré,
//   72h par défaut) → SOLDE DISPONIBLE → RETRAIT.
//
// Le client ne fait qu'UN SEUL paiement pour toute la commande groupée
// (orderGroup), mais chaque Order (une par vendeur, déjà l'architecture
// existante) doit générer sa propre trace de répartition : commission
// prélevée + part nette vendeur bloquée en attente. Le livreur est
// crédité séparément (frais de livraison, pas de commission par défaut).
// Appelé une seule fois par commande, au moment exact où le paiement est
// confirmé (voir payment.controller.js::confirmPayment et le webhook
// CinetPay — les deux points où paymentStatus passe à 'paid').
// =====================================================

async function splitOrderPayment(order) {
  try {
    const config = await FinanceConfig.getConfig();

    // Commission calculée ARTICLE PAR ARTICLE — chaque produit peut
    // appartenir à une catégorie avec son propre taux (ex. 3% pour une
    // catégorie à faible marge, 8% pour une autre), au lieu d'un taux
    // unique appliqué au total de la commande. Repli sur le taux par
    // défaut (marketplaceCommissionRate) si le produit/sa catégorie n'a
    // pas de taux spécifique configuré.
    let commission = 0;
    if (order.items?.length) {
      const productIds = order.items.map((it) => it.product);
      const products = await Product.find({ _id: { $in: productIds } }).select('category');
      const categoryById = new Map(products.map((p) => [String(p._id), p.category]));

      for (const item of order.items) {
        const category = categoryById.get(String(item.product));
        const rate = (category && config.categoryCommissionRates.get(category)) ?? config.marketplaceCommissionRate;
        commission += Math.round((item.total ?? item.price * item.quantity) * (rate / 100));
      }
    } else {
      // Repli si items indisponible pour une raison quelconque — ne
      // jamais planter la répartition, juste utiliser le taux par défaut
      // sur le total connu.
      commission = Math.round((order.subtotal || 0) * (config.marketplaceCommissionRate / 100));
    }

    const grossSeller = order.subtotal || 0;
    const netSeller = grossSeller - commission;

    // Part vendeur — bloquée en "fonds en attente", débloquée après le
    // délai configuré (72h par défaut) une fois la commande livrée. Le
    // déblocage effectif (passage HELD → AVAILABLE) est déjà comptabilisé
    // au niveau du solde vendeur (seller-payment.controller.js filtre déjà
    // sur status:'delivered' pour ne compter que les fonds véritablement
    // débloqués) — cette écriture-ci trace le moment où l'argent entre
    // dans le circuit, pas encore le moment où il devient retirable.
    await recordLedgerEntry({
      type: 'seller_payout_held',
      direction: 'debit', // sort de la trésorerie SINE.SHOP au profit du vendeur, à terme
      amount: netSeller,
      order: order._id,
      orderGroup: order.orderGroup,
      user: order.seller,
      description: `Part vendeur (net) pour la commande #${order.orderNumber || order._id} — brut ${grossSeller}, commission ${commission} (calculée par article/catégorie)`,
    });

    // Commission SINE.SHOP — trace explicite du prélèvement, distincte de
    // la part vendeur (sinon impossible de savoir combien SINE.SHOP a
    // réellement gagné sur cette commande précise lors d'un audit).
    await recordLedgerEntry({
      type: 'commission',
      direction: 'credit', // entre dans la trésorerie SINE.SHOP
      amount: commission,
      order: order._id,
      orderGroup: order.orderGroup,
      user: order.seller,
      description: `Commission SINE.SHOP (${commission} FCFA, calculée par article/catégorie) sur la commande #${order.orderNumber || order._id}`,
    });

    // Part livreur — les frais de livraison, séparés de la vente elle-même.
    // Le livreur n'est pas forcément déjà assigné au moment du paiement
    // (il l'est souvent après, à la préparation) — dans ce cas, cette
    // écriture est simplement ignorée ici et se fera plus tard au moment
    // de l'assignation si besoin d'une trace précise par livreur.
    if (order.livreur && order.shippingCost) {
      const deliveryCommission = Math.round(order.shippingCost * (config.deliveryCommissionRate / 100));
      const netLivreur = order.shippingCost - deliveryCommission;

      await recordLedgerEntry({
        type: 'seller_payout_held',
        direction: 'debit',
        amount: netLivreur,
        order: order._id,
        orderGroup: order.orderGroup,
        user: order.livreur,
        description: `Part livreur pour la commande #${order.orderNumber || order._id}`,
      });
    }

    return { grossSeller, commission, netSeller };
  } catch (error) {
    // Une répartition manquée ne doit jamais faire échouer la confirmation
    // du paiement elle-même — le client a payé, la commande doit avancer
    // même si la trace comptable interne échoue (à corriger via le
    // journal financier / réconciliation, pas en bloquant l'utilisateur).
    logger.error('Error splitting order payment:', error);
    return null;
  }
}

// Répartit TOUTES les commandes d'un même groupe (achat multi-vendeurs) —
// point d'entrée unique à appeler après confirmation de paiement.
async function splitOrderGroupPayment(orders) {
  const results = [];
  for (const order of orders) {
    results.push(await splitOrderPayment(order));
  }
  return results;
}

module.exports = { splitOrderPayment, splitOrderGroupPayment };

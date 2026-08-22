const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const EmailService = require('./email.service');
const logger = require('../utils/logger');

// Crédite l'affilié qui a parrainé l'auteur d'une commande, quand celle-ci
// passe "confirmée" (paiement réussi) — jusqu'ici, seul le bonus fixe
// d'inscription (50 FCFA, voir auth.controller.js:register) était crédité ;
// la commission sur achat (models/Affiliate.js:referrals, endpoint
// POST /affiliates/track/:code) existait côté backend mais n'était jamais
// appelée par aucune page, donc jamais réellement créditée.
//
// Appelé depuis order.controller.js (confirmOrder) et payment.controller.js
// (confirmPayment, webhook CinetPay) — partout où une commande passe à
// "confirmed" pour la première fois. Ne fait jamais échouer l'appelant :
// toute erreur ici est journalisée et avalée.
async function creditReferralForOrder(order) {
  try {
    const buyer = await User.findById(order.user);
    if (!buyer?.referredBy) return;

    const affiliate = await Affiliate.findOne({ user: buyer.referredBy });
    if (!affiliate || affiliate.status !== 'active') return;

    // Ne jamais créditer deux fois la même commande (rappel de webhook,
    // double confirmation, etc.)
    const dejaCredite = affiliate.referrals.some(
      r => r.order && r.order.toString() === order._id.toString()
    );
    if (dejaCredite) return;

    const commission = (order.total * affiliate.commissionRate) / 100;

    affiliate.referrals.push({
      user: order.user,
      order: order._id,
      orderTotal: order.total,
      commission,
      status: 'pending',
    });

    affiliate.totalSales += order.total;
    affiliate.totalCommission += commission;
    if (affiliate.stats) {
      affiliate.stats.conversions = (affiliate.stats.conversions || 0) + 1;
      if (typeof affiliate.calculateConversionRate === 'function') {
        affiliate.calculateConversionRate();
      }
    }

    await affiliate.save();
    logger.info(`Commission d'affiliation créditée : ${commission} ${order.currency} à l'affilié ${affiliate._id} pour la commande ${order._id}`);

    // Email dédié (affiliation@sineshophome.com) — n'existait pas du tout,
    // l'affilié n'était jamais notifié qu'une commission venait d'être
    // créditée sur son compte.
    try {
      const affiliateUser = await User.findById(affiliate.user);
      if (affiliateUser?.email) {
        await EmailService.sendAffiliationNotification(
          affiliateUser.email,
          affiliateUser.firstName,
          `Vous venez de gagner une nouvelle commission de ${commission} ${order.currency} suite à un achat effectué par l'un de vos filleuls.`,
          `${commission} ${order.currency}`,
          `${affiliate.totalCommission} ${order.currency}`,
          affiliateUser.preferredLanguage
        );
      }
    } catch (mailError) {
      logger.error('Error sending affiliation commission email:', mailError);
    }
  } catch (error) {
    logger.error('Error crediting affiliate referral for order:', error);
  }
}

module.exports = { creditReferralForOrder };

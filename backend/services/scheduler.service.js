// Planificateur de tâches — remplace services/sheduler.service.js (nom
// mal orthographié, ET fondamentalement incompatible avec ce projet :
// il dépendait de node-cron, absent de package.json, et importait des
// services qui n'existent nulle part ici — BackupService, CacheService,
// RecommendationService, SearchService — clairement hérité d'un autre
// projet, jamais adapté). Reconstruit à zéro, volontairement minimal :
// une seule tâche, réellement utile et testée, plutôt qu'un grand
// nombre de tâches copiées d'un autre contexte.
//
// N'introduit aucune nouvelle dépendance npm — un simple setInterval
// suffit amplement à ce volume de tâches périodiques ; plus simple à
// déployer qu'un vrai planificateur cron pour un besoin aussi restreint.

const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const EmailService = require('./email.service');
const logger = require('../utils/logger');

const ORDER_REMINDER_HOURS = parseInt(process.env.ORDER_REMINDER_HOURS, 10) || 24;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // vérifie toutes les 30 minutes

let intervalHandle = null;

// Annule automatiquement les commandes jamais payées après
// ORDER_REMINDER_HOURS heures (24h par défaut) — sans ça, le stock
// réservé par un client qui abandonne son paiement reste bloqué
// indéfiniment, invisible aux autres acheteurs.
async function cancelStaleUnpaidOrders() {
  const cutoff = new Date(Date.now() - ORDER_REMINDER_HOURS * 60 * 60 * 1000);

  const staleOrders = await Order.find({
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: { $ne: 'cash_on_delivery' }, // le paiement à la livraison n'a pas de délai de paiement en ligne
    createdAt: { $lt: cutoff },
  }).populate('user', 'firstName email preferredLanguage');

  if (staleOrders.length === 0) return;

  logger.info(`Scheduler: ${staleOrders.length} commande(s) non payée(s) depuis plus de ${ORDER_REMINDER_HOURS}h à annuler.`);

  for (const order of staleOrders) {
    try {
      order.status = 'cancelled';
      order.cancellationReason = `Paiement non complété sous ${ORDER_REMINDER_HOURS}h (annulation automatique)`;
      await order.save();

      // Restaurer le stock de cette commande
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      // Le paiement partagé (voir Order.orderGroup) n'est marqué "failed"
      // que si TOUTES les commandes du groupe sont désormais annulées —
      // sinon d'autres vendeurs du même achat pourraient encore être payés.
      const siblingsStillPending = await Order.countDocuments({
        orderGroup: order.orderGroup,
        status: { $nin: ['cancelled', 'refunded'] },
      });
      if (siblingsStillPending === 0) {
        await Payment.findOneAndUpdate({ orderGroup: order.orderGroup }, { status: 'failed' });
      }

      if (order.user?.email) {
        await EmailService.sendPaymentFailed(order.user.email, order, order.user.preferredLanguage).catch(() => {});
      }
    } catch (error) {
      logger.error(`Scheduler: erreur lors de l'annulation automatique de la commande ${order._id}:`, error);
    }
  }
}

// Annule automatiquement les réservations jamais transformées en commande
// après 72h — la réservation "bloque" implicitement l'attention du vendeur
// sur ce produit pour ce client, mais rien ne doit rester indéfiniment
// "en attente" sans que personne n'agisse. Aucun stock à restaurer : la
// réservation n'a jamais décrémenté le stock (seule une vraie commande le
// fait, voir order.controller.js::createOrder).
async function cancelExpiredReservations() {
  const now = new Date();

  const expired = await Reservation.find({
    status: { $in: ['pending', 'confirmed'] },
    expiresAt: { $lt: now },
  });

  if (expired.length === 0) return;

  logger.info(`Scheduler: ${expired.length} réservation(s) expirée(s) (72h) à annuler.`);

  for (const reservation of expired) {
    try {
      reservation.status = 'cancelled';
      reservation.cancellationReason = 'Réservation expirée après 72h sans commande';
      await reservation.save();
    } catch (error) {
      logger.error(`Scheduler: erreur lors de l'annulation de la réservation ${reservation._id}:`, error);
    }
  }
}

function start() {
  if (intervalHandle) return; // déjà démarré
  logger.info(`Scheduler démarré — vérification des commandes non payées toutes les 30 minutes (seuil: ${ORDER_REMINDER_HOURS}h)`);
  intervalHandle = setInterval(() => {
    cancelStaleUnpaidOrders().catch(error => logger.error('Scheduler: erreur inattendue:', error));
    cancelExpiredReservations().catch(error => logger.error('Scheduler: erreur inattendue (réservations):', error));
  }, CHECK_INTERVAL_MS);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { start, stop, cancelStaleUnpaidOrders, cancelExpiredReservations };

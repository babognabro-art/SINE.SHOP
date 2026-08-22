// ============================================================
// SINE.SHOP — Webhook WhatsApp entrant (Infobip)
// ============================================================
const { handleIncomingMessage } = require('../services/whatsapp.service');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/asyncHandler');

// POST /api/webhooks/whatsapp — appelée par Infobip à chaque message reçu
// sur le numéro WhatsApp SINE.SHOP. Répond TOUJOURS 200 rapidement à
// Infobip (même en cas d'erreur de traitement interne) — un webhook qui
// répond une erreur HTTP fait qu'Infobip RÉESSAIE d'envoyer le même
// événement en boucle, ce qui aggrave un problème plutôt que de le
// signaler proprement.
const receiveWhatsAppWebhook = asyncHandler(async (req, res) => {
  // Accuse réception IMMÉDIATEMENT — le traitement (identification,
  // appel IA, envoi de la réponse) se fait ensuite, sans faire attendre
  // Infobip qui a ses propres délais d'expiration courts.
  res.status(200).json({ received: true });

  try {
    // Format Infobip WhatsApp inbound : { results: [{ from, to, message: { text, type }, ... }] }
    const results = req.body?.results || [];
    if (!Array.isArray(results) || results.length === 0) {
      logger.info('WhatsApp webhook — no results in payload', JSON.stringify(req.body).slice(0, 500));
      return;
    }

    for (const item of results) {
      const from = item?.from;
      const text = item?.message?.text || item?.message?.button?.text || '';

      if (!from) {
        logger.info('WhatsApp webhook — item without "from", skipped');
        continue;
      }
      if (!text) {
        // Message non textuel (image, audio, document...) — pas encore
        // géré (voir document reçu : sendWhatsAppImage/Document prévus
        // "plus tard", pas dans ce premier lot). On log sans planter.
        logger.info(`WhatsApp webhook — non-text message from ${from}, skipped`);
        continue;
      }

      // Traitement asynchrone — la réponse HTTP à Infobip est déjà
      // partie plus haut, celui-ci peut prendre son temps (appel IA).
      handleIncomingMessage(from, text).catch((err) => {
        logger.error('Error in handleIncomingMessage:', err);
      });
    }
  } catch (error) {
    // La réponse 200 est déjà partie — on log seulement, rien d'autre à
    // faire côté HTTP à ce stade.
    logger.error('Error processing WhatsApp webhook payload:', error);
  }
});

module.exports = { receiveWhatsAppWebhook };

// ============================================================
// SINE.SHOP — Logique métier WhatsApp (fichier séparé, comme demandé)
// ============================================================
// Étape actuelle de l'architecture décrite : webhook → identification →
// réponse. L'IA (ai.service.js, déjà construite ailleurs dans ce projet
// avec accès aux commandes/paiements réels du compte) n'est appelée QUE
// si l'expéditeur est identifié comme un compte SINE.SHOP existant —
// sinon un message d'accueil invite à s'inscrire/se connecter, jamais
// d'improvisation ni d'invention de données pour un inconnu.
// ============================================================

const User = require('../models/User');
const { buildIdentifierQuery } = require('../controllers/auth.controller');
const AIService = require('./ai.service');
const { sendWhatsAppText } = require('../config/whatsapp');
const logger = require('../utils/logger');

const WELCOME_MESSAGE = `👋 Bonjour et bienvenue chez SINE.SHOP !

Je ne retrouve pas de compte SINE.SHOP associé à ce numéro WhatsApp.

Pour que je puisse vous aider avec vos commandes, réservations ou questions, connectez-vous ou créez un compte sur :
👉 https://www.sineshophome.com

Une fois votre compte relié à ce numéro, je pourrai vous répondre personnellement ici même. 😊`;

// Traite un message WhatsApp entrant — identifie l'expéditeur, obtient une
// réponse (IA si compte connu, accueil générique sinon), et la renvoie.
// Ne lève jamais d'exception vers l'appelant (le webhook) — une erreur ici
// ne doit jamais faire échouer l'accusé de réception à Infobip.
async function handleIncomingMessage(from, text) {
  logger.info(`📱 WhatsApp incoming message — From: ${from} — Message: ${text}`);

  try {
    const identifierQuery = buildIdentifierQuery(from);
    const user = identifierQuery ? await User.findOne(identifierQuery) : null;

    let replyText;
    if (!user) {
      replyText = WELCOME_MESSAGE;
    } else {
      // Réutilise le VRAI moteur IA du projet (contexte réel du compte :
      // commandes, paiements, etc.) — jamais une réponse inventée à part.
      const result = await AIService.processQuery(text, user, { channel: 'whatsapp' });
      replyText = result?.response || '';
      if (!replyText) {
        replyText = 'Désolé, je n\'ai pas pu traiter votre demande. Un membre de notre équipe vous répondra bientôt.';
      }
    }

    await sendWhatsAppText(from, replyText);
    return { success: true, identified: !!user, replyText };
  } catch (error) {
    logger.error('Error handling incoming WhatsApp message:', error);
    // Repli — l'utilisateur reçoit toujours quelque chose plutôt qu'un
    // silence total, même si l'IA ou la base de données a échoué.
    try {
      await sendWhatsAppText(from, 'Désolé, une erreur est survenue. Notre équipe a été notifiée et reviendra vers vous rapidement.');
    } catch (sendError) {
      logger.error('Error sending WhatsApp fallback reply:', sendError);
    }
    return { success: false, error: error.message };
  }
}

module.exports = { handleIncomingMessage };

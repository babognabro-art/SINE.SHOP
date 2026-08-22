// ============================================================
// SINE.SHOP — Service SMS Infobip
// ============================================================
// API Infobip :
// https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-messages
//
// Variables .env nécessaires :
// INFOBIP_API_KEY=...
// INFOBIP_BASE_URL=xxxxxxx.api.infobip.com
// INFOBIP_SENDER=SINE.SHOP
// APP_NAME=SINE.SHOP
// ============================================================

let smsEnabled = false;

const smsConfig = {
  apiKey: process.env.INFOBIP_API_KEY || '',
  baseUrl: (process.env.INFOBIP_BASE_URL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, ''),
  from: process.env.INFOBIP_SENDER || process.env.APP_NAME || 'SINE.SHOP',
};

// ============================================================
// INITIALISATION
// ============================================================

if (smsConfig.apiKey && smsConfig.baseUrl) {
  smsEnabled = true;

  console.log('✅ SMS service (Infobip) initialized successfully');
  console.log(`📡 Infobip endpoint: https://${smsConfig.baseUrl}`);
  console.log(`📨 Sender ID: ${smsConfig.from}`);
} else {
  console.log('⚠️ SMS service (Infobip) disabled — credentials missing');
}

// ============================================================
// ENVOI SMS GÉNÉRAL
// ============================================================

const sendSMS = async (to, message) => {
  // ----------------------------------------------------------
  // MODE MOCK — utilisé si Infobip n'est pas configuré
  // ----------------------------------------------------------

  if (!smsEnabled) {
    console.log(`📱 [MOCK] SMS vers : ${to}`);
    console.log(`💬 [MOCK] Message : ${message}`);

    return {
      success: true,
      mock: true,
      sid: `mock_${Date.now()}`,
      to,
      message,
    };
  }

  // ----------------------------------------------------------
  // VÉRIFICATION DES DONNÉES
  // ----------------------------------------------------------

  if (!to) {
    throw new Error('Numéro de téléphone destinataire manquant.');
  }

  if (!message) {
    throw new Error('Message SMS vide.');
  }

  try {
    // --------------------------------------------------------
    // APPEL API INFOBIP
    // --------------------------------------------------------

    const response = await fetch(
      `https://${smsConfig.baseUrl}/sms/2/text/advanced`,
      {
        method: 'POST',

        headers: {
          Authorization: `App ${smsConfig.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },

        body: JSON.stringify({
          messages: [
            {
              destinations: [
                {
                  // Infobip attend un numéro MSISDN SANS le préfixe "+"
                  // (ex: "22507000000", pas "+22507000000"). Le stocker tel
                  // quel avec le "+" fait échouer l'envoi côté Infobip —
                  // silencieusement pour l'utilisateur si l'appelant avale
                  // l'erreur, ce qui explique des codes "jamais reçus" par SMS
                  // alors que l'email (non concerné par ce format) fonctionne.
                  to: String(to).replace(/^\+/, '').replace(/[\s().-]/g, ''),
                },
              ],

              from: smsConfig.from,

              text: String(message),
            },
          ],
        }),
      }
    );

    // --------------------------------------------------------
    // LECTURE DE LA RÉPONSE
    // --------------------------------------------------------

    const data = await response.json();

    // --------------------------------------------------------
    // ERREUR INFOBIP
    // --------------------------------------------------------

    if (!response.ok) {
      const errorMessage =
        data?.requestError?.serviceException?.text ||
        data?.requestError?.serviceException?.message ||
        data?.requestError?.serviceException?.validationErrors?.[0]?.message ||
        'Erreur lors de l’envoi du SMS via Infobip.';

      throw new Error(errorMessage);
    }

    // --------------------------------------------------------
    // RÉSULTAT
    // --------------------------------------------------------

    const result = data?.messages?.[0];

    // Piège Infobip : l'appel HTTP peut réussir (200 OK, "accepté") alors
    // que le message lui-même est rejeté côté opérateur — groupId 3
    // (REJECTED) ou 4 (UNDELIVERABLE) dans le statut du message, pas dans
    // le code HTTP de la réponse. Sans cette vérification, l'appelant
    // (ex: forgotPassword) croyait l'envoi réussi et répondait "succès" à
    // l'utilisateur alors qu'aucun SMS n'était réellement en chemin —
    // exactement le symptôme "je ne reçois jamais le code par SMS".
    const groupId = result?.status?.groupId;
    if (groupId === 3 || groupId === 4) {
      throw new Error(
        result?.status?.description || 'Le SMS a été rejeté par l\'opérateur (numéro invalide, route non autorisée pour ce pays, ou expéditeur non homologué).'
      );
    }

    console.log(
      `📱 SMS envoyé à ${to} — messageId: ${result?.messageId || 'N/A'}`
    );

    console.log(
      `📊 Statut Infobip: ${
        result?.status?.name ||
        result?.status?.description ||
        'PENDING'
      }`
    );

    return {
      success: true,
      sid: result?.messageId,
      to,
      message,
      status: result?.status,
      raw: result,
    };

  } catch (error) {
    console.error(
      `❌ Erreur envoi SMS vers ${to}:`,
      error.message
    );

    throw error;
  }
};

// ============================================================
// SMS OTP — VÉRIFICATION DU COMPTE
// ============================================================
//
// IMPORTANT :
// Le code doit être généré et vérifié par ton backend.
// Cette fonction se contente de l'envoyer.
//
// Durée affichée : 10 minutes.
// La véritable expiration doit également être gérée
// côté backend lors de la vérification du code.
// ============================================================

const sendVerificationSMS = async (to, code, name) => {
  const appName = process.env.APP_NAME || 'SINE.SHOP';
  const message =
    `${appName} : votre code de verification est ${code}. ` +
    `Valable 5 minutes. Code confidentiel, ne le partagez avec personne.`;

  return await sendSMS(to, message);
};

// ============================================================
// SMS COMMANDE
// ============================================================

const sendOrderSMS = async (to, orderId, status) => {
  const appName = process.env.APP_NAME || 'SINE.SHOP';

  const message =
    `${appName} : votre commande #${orderId} est maintenant ${status}. ` +
    `Merci de choisir ${appName}.`;

  return await sendSMS(to, message);
};

// ============================================================
// SMS LIVRAISON
// ============================================================

const sendDeliverySMS = async (to, orderId, livreurName) => {
  const appName = process.env.APP_NAME || 'SINE.SHOP';

  const message =
    `${appName} : votre commande #${orderId} est en cours de livraison ` +
    `par ${livreurName}. Suivez votre commande sur ${appName}.`;

  return await sendSMS(to, message);
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendSMS,
  sendVerificationSMS,
  sendOrderSMS,
  sendDeliverySMS,
  smsEnabled,
  smsConfig,
};
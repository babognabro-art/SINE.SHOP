// ============================================================
// SINE.SHOP — Service WhatsApp Infobip
// ============================================================
// Volontairement séparé de config/sms.js — canal différent (WhatsApp vs
// SMS classique), même prestataire (Infobip) mais expéditeur et API
// différents. Mélanger les deux dans un seul fichier aurait rendu sms.js
// énorme et confus (exactement ce que l'utilisateur voulait éviter).
//
// Variables .env nécessaires :
// INFOBIP_API_KEY=...            (déjà utilisée par sms.js — partagée)
// INFOBIP_BASE_URL=xxxxxxx.api.infobip.com   (déjà utilisée par sms.js)
// INFOBIP_WHATSAPP_SENDER=2250546248319      (numéro WhatsApp Infobip dédié,
//                                              SANS le "+", format MSISDN)
// ============================================================

let whatsappEnabled = false;

const whatsappConfig = {
  apiKey: process.env.INFOBIP_API_KEY || '',
  baseUrl: (process.env.INFOBIP_BASE_URL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, ''),
  from: (process.env.INFOBIP_WHATSAPP_SENDER || '').replace(/^\+/, '').replace(/[\s().-]/g, ''),
};

if (whatsappConfig.apiKey && whatsappConfig.baseUrl && whatsappConfig.from) {
  whatsappEnabled = true;
  console.log('✅ WhatsApp service (Infobip) initialized successfully');
  console.log(`📡 Infobip endpoint: https://${whatsappConfig.baseUrl}`);
  console.log(`📱 WhatsApp sender: ${whatsappConfig.from}`);
} else {
  console.log('⚠️ WhatsApp service (Infobip) disabled — credentials missing');
}

function normalizeMsisdn(phone) {
  return String(phone || '').replace(/^\+/, '').replace(/[\s().-]/g, '');
}

// ============================================================
// ENVOI TEXTE LIBRE — uniquement possible dans les 24h suivant le
// dernier message du client (règle WhatsApp Business standard). Passé ce
// délai, seul un template pré-approuvé peut être envoyé (voir
// sendWhatsAppTemplate ci-dessous).
// ============================================================
const sendWhatsAppText = async (to, message) => {
  if (!whatsappEnabled) {
    console.log(`📱 [MOCK] WhatsApp texte vers : ${to}`);
    console.log(`💬 [MOCK] Message : ${message}`);
    return { success: true, mock: true, to, message };
  }

  if (!to) throw new Error('Numéro WhatsApp destinataire manquant.');
  if (!message) throw new Error('Message WhatsApp vide.');

  const response = await fetch(`https://${whatsappConfig.baseUrl}/whatsapp/1/message/text`, {
    method: 'POST',
    headers: {
      Authorization: `App ${whatsappConfig.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: whatsappConfig.from,
      to: normalizeMsisdn(to),
      content: { text: String(message) },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.requestError?.serviceException?.text
      || data?.requestError?.serviceException?.message
      || 'Erreur lors de l\'envoi du message WhatsApp via Infobip.';
    throw new Error(errorMessage);
  }

  console.log(`📱 WhatsApp envoyé à ${to} — messageId: ${data?.messages?.[0]?.messageId || 'N/A'}`);
  return { success: true, to, message, raw: data };
};

// ============================================================
// ENVOI TEMPLATE — seul moyen d'initier une conversation ou de relancer
// après 24h. Nécessite un template déjà APPROUVÉ par Meta (voir document
// reçu — sine_shop_promotion en attente, welcome/customer_menu rejetés à
// ce jour). Aucun template n'est encore utilisable en production tant
// qu'aucun n'est approuvé — cette fonction est prête, mais son usage
// réel attend l'approbation Meta d'au moins un template.
// ============================================================
const sendWhatsAppTemplate = async (to, templateName, language, placeholders = []) => {
  if (!whatsappEnabled) {
    console.log(`📱 [MOCK] WhatsApp template "${templateName}" vers : ${to}`);
    return { success: true, mock: true, to, templateName };
  }

  const response = await fetch(`https://${whatsappConfig.baseUrl}/whatsapp/1/message/template`, {
    method: 'POST',
    headers: {
      Authorization: `App ${whatsappConfig.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [{
        from: whatsappConfig.from,
        to: normalizeMsisdn(to),
        content: {
          templateName,
          templateData: { body: { placeholders } },
          language: language || 'fr',
        },
      }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.requestError?.serviceException?.text
      || 'Erreur lors de l\'envoi du template WhatsApp via Infobip.';
    throw new Error(errorMessage);
  }
  return { success: true, to, templateName, raw: data };
};

module.exports = {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  whatsappEnabled,
  whatsappConfig,
};

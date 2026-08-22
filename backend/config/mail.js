// Service d'emails — Brevo.
// API : https://developers.brevo.com/reference/sendtransacemail
//
// Deux modes d'envoi, choisis automatiquement :
//  - Mode "template Brevo" (recommandé) : si BREVO_TEMPLATE_ID est défini,
//    chaque email est envoyé via le template unique hébergé sur Brevo
//    (variables {{ params.xxx }}), avec juste les paramètres qui changent.
//  - Mode "HTML interne" (repli automatique) : si BREVO_TEMPLATE_ID n'est
//    pas encore configuré, le HTML complet est généré içi même par
//    config/emailTemplates.js et envoyé tel quel — comportement identique
//    à avant, pour ne jamais casser l'envoi d'emails en attendant que le
//    template soit créé côté Brevo.

let mailEnabled = false;
let mailConfig = {
  apiKey: process.env.BREVO_API_KEY || '',
  fromEmail: process.env.MAIL_FROM || 'noreply@sineshophome.com',
  fromName: process.env.APP_NAME || 'SINE.SHOP',
};

// ID du template unique créé dans Brevo (Campagnes > Templates > votre
// template SINE.SH♡P) — à renseigner dans les variables d'environnement
// une fois le template importé et publié côté Brevo. Tant qu'il est absent,
// le système bascule automatiquement sur le HTML généré en interne.
const BREVO_TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID ? parseInt(process.env.BREVO_TEMPLATE_ID, 10) : null;

if (process.env.BREVO_TEMPLATE_ID && !BREVO_TEMPLATE_ID) {
  console.warn("⚠️ BREVO_TEMPLATE_ID est présent mais invalide. Utilisez uniquement l'ID numérique du template Brevo.");
}

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

if (mailConfig.apiKey) {
  mailEnabled = true;
  console.log('✅ Mail service (Brevo) initialized successfully');
  console.log(BREVO_TEMPLATE_ID
    ? `📧 Mode template Brevo actif (templateId=${BREVO_TEMPLATE_ID})`
    : '📧 Mode HTML interne actif (BREVO_TEMPLATE_ID non défini)');
} else {
  console.log('⚠️  Mail service (Brevo) disabled (no credentials)');
}

// Indique au reste du backend quel mode est actif — utilisé par
// services/email.service.js pour choisir sendMail() ou sendTemplateMail().
const isTemplateModeEnabled = () => !!BREVO_TEMPLATE_ID;

// Envoi "classique" — HTML complet généré en interne (repli automatique
// tant que BREVO_TEMPLATE_ID n'est pas configuré).
const sendMail = async (to, subject, html, from = mailConfig.fromEmail, fromName = mailConfig.fromName) => {
  if (!mailEnabled) {
    console.log(`📧 [MOCK] Email to: ${to}, Subject: ${subject}`);
    console.log(`📧 [MOCK] HTML: ${html ? html.substring(0, 100) + '...' : 'No HTML'}`);
    return {
      success: true,
      mock: true,
      messageId: `mock_${Date.now()}`,
      to,
      subject,
    };
  }

  try {
    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': mailConfig.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de l\'envoi de l\'email via Brevo');
    }

    console.log(`📧 Email envoyé à ${to} (Brevo messageId: ${data.messageId})`);
    return data;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw error;
  }
};

// Envoi via le template Brevo hébergé (templateId + params) — mode
// recommandé une fois le template créé côté Brevo. `subject` reste
// transmis pour que chaque type d'email garde son propre objet traduit,
// même si le template a lui aussi un objet par défaut.
const sendTemplateMail = async (to, params, from = mailConfig.fromEmail, fromName = mailConfig.fromName, subject) => {
  if (!mailEnabled) {
    console.log(`📧 [MOCK] Template email to: ${to}, Subject: ${subject}`);
    console.log(`📧 [MOCK] Params:`, params);
    return {
      success: true,
      mock: true,
      messageId: `mock_${Date.now()}`,
      to,
      subject,
    };
  }

  if (!BREVO_TEMPLATE_ID) {
    throw new Error('BREVO_TEMPLATE_ID non configuré — impossible d\'envoyer via le template Brevo.');
  }

  try {
    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': mailConfig.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        templateId: BREVO_TEMPLATE_ID,
        sender: { name: fromName, email: from },
        to: [{ email: to }],
        params,
        ...(subject ? { subject } : {}),
      }),
    });

    const data = await response.json();

        if (!response.ok) {
      console.error(`❌ Brevo a refusé l'envoi via template (HTTP ${response.status}) — réponse complète :`, JSON.stringify(data));
      throw new Error(data.message || `Erreur Brevo (HTTP ${response.status}) — voir les logs pour le détail complet.`);
    }

    console.log(`📧 Email (template) envoyé à ${to} (Brevo messageId: ${data.messageId})`);
    return data;
  } catch (error) {
    console.error('❌ Template email sending error:', error.message);
    throw error;
  }
};

module.exports = {
  sendMail,
  sendTemplateMail,
  isTemplateModeEnabled,
  mailEnabled,
  mailConfig,
};

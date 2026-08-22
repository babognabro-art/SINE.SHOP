const { sendMail, sendTemplateMail, isTemplateModeEnabled } = require('../config/mail');
const { renderEmail } = require('../config/emailTemplates');
const logger = require('../utils/logger');

// Enveloppe commune : rend le contenu puis envoie, avec le bon expéditeur
// selon le type (voir config/emailTemplates.js). `lang` vient de
// user.preferredLanguage — si non fourni, on utilise le français.
// Bascule automatique : si BREVO_TEMPLATE_ID est configuré, envoie via le
// template Brevo hébergé (params) ; sinon, envoie le HTML généré en interne
// (comportement historique, toujours disponible en repli).
//
// 🔴 Filet de sécurité ajouté — avant, si l'envoi via le template Brevo
// échouait (mauvais ID, template supprimé/dépublié côté Brevo, erreur de
// correspondance de variables...), l'exception remontait telle quelle et
// l'email n'était JAMAIS envoyé, sans que l'utilisateur ne voie la moindre
// erreur claire (juste "je ne reçois jamais mes mails"). Maintenant, un
// échec du mode template bascule automatiquement sur le HTML interne
// (qui, lui, correspond désormais exactement au vrai visuel SINE.SHOP —
// voir le correctif de wrapHtml() ci-dessus) — l'email part TOUJOURS,
// l'erreur Brevo précise est quand même journalisée pour diagnostic.
async function send(type, to, lang, data) {
  const { subject, html, params, from, fromName } = renderEmail(type, lang || 'fr', data);
  if (isTemplateModeEnabled()) {
    try {
      return await sendTemplateMail(to, params, from, fromName, subject);
    } catch (templateError) {
      logger.error(`Échec de l'envoi via le template Brevo (type=${type}, to=${to}) — bascule sur le HTML interne. Raison : ${templateError.message}`);
      return await sendMail(to, subject, html, from, fromName);
    }
  }
  return await sendMail(to, subject, html, from, fromName);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.sineshophome.com';

class EmailService {
  static async sendVerification(to, code, name, lang) {
    return await send('verify', to, lang, {
      user_name: name,
      otp_code: code,
      expiry_minutes: '5 minutes',
      button_url: `${FRONTEND_URL}/html/login.html?verify=1&identifier=${encodeURIComponent(to)}`,
    });
  }

  static async sendPasswordReset(to, code, name, lang) {
    return await send('password', to, lang, {
      user_name: name,
      otp_code: code,
      expiry_minutes: '48 heures',
      button_url: `${FRONTEND_URL}/html/login.html?reset=1&identifier=${encodeURIComponent(to)}`,
    });
  }

  // Réinitialisation du code de confidentialité (comptes à privilèges) —
  // n'existait pas du tout avant ce correctif. Type dédié 'security_code_reset'
  // (lien à cliquer uniquement, pas de code affiché — contrairement au
  // type 'password' qui affiche un cadre de code, inadapté ici).
  static async sendSecurityCodeResetLink(to, resetUrl, name, lang) {
    return await send('security_code_reset', to, lang, {
      user_name: name,
      button_url: resetUrl,
    });
  }

  static async sendWelcome(to, name, role, lang) {
    return await send('welcome', to, lang, { user_name: name });
  }

  static async sendOrderConfirmation(to, order, lang) {
    return await send('order', to, lang, {
      user_name: `${order.user?.firstName || ''}`.trim() || 'Client',
      order_number: order.orderNumber || order._id,
      order_amount: `${(order.total || 0).toLocaleString()} ${order.currency || 'XOF'}`,
      button_url: `${FRONTEND_URL}/html/confirmation.html?id=${order._id}&type=commande`,
    });
  }

  // Un seul email pour tout un passage en caisse, même s'il a été réparti en
  // plusieurs commandes (une par vendeur) — le client reçoit une confirmation
  // unique de son achat, pas une par vendeur. Réutilise le même type 'order'
  // déjà traduit dans les 4 langues : le numéro et le montant reflètent
  // simplement le total du groupe quand il y a plusieurs commandes.
  static async sendOrderConfirmationGroup(to, userName, orders, orderGroup, lang) {
    const total = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const currency = orders[0]?.currency || 'XOF';
    const orderNumberLabel = orders.length > 1
      ? orders.map(o => o.orderNumber).join(', ')
      : orders[0]?.orderNumber;

    return await send('order', to, lang, {
      user_name: userName || 'Client',
      order_number: orderNumberLabel,
      order_amount: `${total.toLocaleString()} ${currency}`,
      button_url: `${FRONTEND_URL}/html/confirmation.html?group=${orderGroup}&type=commande`,
    });
  }

  static async sendPaymentReceipt(to, payment, lang) {
    return await send('payment_confirmed', to, lang, {
      user_name: payment.userName || 'Client',
      order_number: payment.orderNumber || payment.order,
      paid_amount: `${(payment.amount || 0).toLocaleString()} ${payment.currency || 'XOF'}`,
      payment_method: payment.method || 'N/A',
      button_url: `${FRONTEND_URL}/html/suivi.html?commande=${payment.order}`,
    });
  }

  static async sendPaymentFailed(to, order, lang) {
    return await send('payment_failed', to, lang, {
      user_name: `${order.user?.firstName || ''}`.trim() || 'Client',
      order_number: order.orderNumber || order._id,
      button_url: `${FRONTEND_URL}/html/payment.html?commande=${order._id}`,
    });
  }

  static async sendShipped(to, order, lang) {
    return await send('shipped', to, lang, {
      user_name: `${order.user?.firstName || ''}`.trim() || 'Client',
      order_number: order.orderNumber || order._id,
      carrier: order.livreur ? `${order.livreur.firstName} ${order.livreur.lastName}` : 'SINE.SHOP',
      estimated_delivery: order.estimatedTime || '2-3 jours',
      button_url: `${FRONTEND_URL}/html/suivi.html?commande=${order._id}`,
    });
  }

  static async sendDelivered(to, order, lang) {
    return await send('delivered', to, lang, {
      user_name: `${order.user?.firstName || ''}`.trim() || 'Client',
      order_number: order.orderNumber || order._id,
      button_url: `${FRONTEND_URL}/html/client.html?section=commandes`,
    });
  }

  static async sendNewMessage(to, senderName, preview, lang) {
    return await send('message', to, lang, {
      user_name: 'Client',
      sender_name: senderName,
      message_preview: (preview || '').substring(0, 100),
      button_url: `${FRONTEND_URL}/html/client.html?section=messages`,
    });
  }

  static async sendNewSellerWelcome(to, sellerName, lang) {
    return await send('new_seller', to, lang, {
      user_name: sellerName,
      seller_name: sellerName,
      button_url: `${FRONTEND_URL}/html/vendeur.html`,
    });
  }

  static async sendPromo(to, name, discountPercent, promoCode, endDate, lang) {
    return await send('promo', to, lang, {
      user_name: name || 'Client',
      discount_percent: discountPercent,
      promo_code: promoCode,
      promo_end_date: endDate,
      button_url: `${FRONTEND_URL}/html/collections.html`,
    });
  }

  static async sendReviewRequest(to, name, productName, lang) {
    return await send('review', to, lang, {
      user_name: name || 'Client',
      product_name: productName || '',
      button_url: `${FRONTEND_URL}/html/client.html?section=commandes`,
    });
  }

  static async sendSecurityAlert(to, name, device, date, lang) {
    return await send('alert', to, lang, {
      user_name: name || 'Client',
      device: device || 'Appareil inconnu',
      alert_date: date || new Date().toLocaleString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/client.html?section=parametres`,
    });
  }

  static async sendReservationConfirmation(to, reservation, lang) {
    return await send('reservation', to, lang, {
      user_name: reservation.userName || 'Client',
      product_name: reservation.productName || '',
      start_date: new Date(reservation.startDate).toLocaleDateString('fr-FR'),
      end_date: new Date(reservation.endDate).toLocaleDateString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/client.html?section=reservations`,
    });
  }

  // Notification affiliation (affiliation@sineshophome.com) — commission
  // créditée, retrait payé, etc. `message` porte le texte spécifique à
  // l'événement, réutilisable pour plusieurs cas sans dupliquer le template.
  static async sendAffiliationNotification(to, name, message, amount, totalBalance, lang) {
    return await send('affiliation', to, lang, {
      user_name: name || 'Affilié',
      affiliation_message: message,
      amount: amount || '',
      total_balance: totalBalance || '',
      button_url: `${FRONTEND_URL}/html/sineshopaffiliation.html`,
    });
  }

  // Alerte fraude envoyée aux administrateurs — appelée par ai.service.js
  // mais n'existait jamais avant (aurait fait planter la détection de fraude
  // dès qu'un score élevé était atteint).
  static async sendFraudAlert(alertData) {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || SendersFallback();
    return await send('alert', adminEmail, 'fr', {
      user_name: 'Équipe SINE.SHOP',
      device: `Commande #${alertData.orderId} — ${alertData.userName} (${alertData.userEmail})`,
      alert_date: new Date().toLocaleString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/administrateur.html`,
    });
  }
  // Notifie contact@sineshophome.com d'une nouvelle candidature Administrateur
  // (formulaire seler-page.html) — inclut les liens Cloudinary des documents
  // fournis par le candidat (CV, lettre, pièce d'identité, justificatif).
  static async sendAdminApplicationNotification(application) {
    const { buildApplicationFileUrl } = require('../controllers/adminApplication.controller');
    const genderMap = { homme: 'Homme', femme: 'Femme', autre: 'Autre' };
    const maritalMap = { celibataire: 'Célibataire', marie: 'Marié(e)', divorce: 'Divorcé(e)', veuf: 'Veuf/Veuve', pacse: 'Pacsé(e)' };
    const educationMap = { aucun: 'Aucun', primaire: 'Primaire', secondaire: 'Secondaire', bac: 'Baccalauréat', licence: 'Licence (Bac+3)', master: 'Master (Bac+5)', doctorat: 'Doctorat', autre: 'Autre' };
    const experienceMap = { '0': 'Moins d\'1 an', '1': '1-2 ans', '3': '3-5 ans', '6': '6-10 ans', '11': '11-15 ans', '16': 'Plus de 15 ans' };

    // Liens signés sur notre propre domaine (voir adminApplication.controller.js)
    // — le clic ouvre le document directement, jamais l'URL Cloudinary brute.
    const docLinks = [];
    if (application.cvUrl) docLinks.push(`<a href="${buildApplicationFileUrl(application._id, 'cv')}">📄 CV</a>`);
    if (application.letterUrl) docLinks.push(`<a href="${buildApplicationFileUrl(application._id, 'letter')}">✉️ Lettre de motivation</a>`);
    if (application.idUrl) docLinks.push(`<a href="${buildApplicationFileUrl(application._id, 'id')}">🪪 Pièce d'identité</a>`);
    if (application.proofUrl) docLinks.push(`<a href="${buildApplicationFileUrl(application._id, 'proof')}">🏠 Justificatif de domicile</a>`);

    const recipient = process.env.EMAIL_FROM_CONTACT || 'contact@sineshophome.com';

    const data = {
      user_name: `${application.firstName} ${application.lastName}`,
      firstname: application.firstName,
      lastname: application.lastName,
      email: application.email,
      phone: application.phone,
      birthdate: application.birthdate || 'Non renseigné',
      gender: genderMap[application.gender] || application.gender || 'Non renseigné',
      marital: maritalMap[application.marital] || application.marital || 'Non renseigné',
      children: application.children || '0',
      address: application.address || 'Non renseigné',
      city: application.city || 'Non renseigné',
      country: application.country || 'Non renseigné',
      education: educationMap[application.education] || application.education || 'Non renseigné',
      experience: experienceMap[application.experience] || application.experience || 'Non renseigné',
      skills: application.skills || 'Non renseigné',
      motivation: application.motivation || 'Non renseigné',
      documents_html: docLinks.length ? docLinks.join(' &nbsp;|&nbsp; ') : 'Aucun document',
      button_url: `mailto:${application.email}`,
    };

    // Utilise désormais exactement le même template Brevo officiel que tous
    // les autres emails. Les détails de la candidature restent injectés dans
    // params.dynamicContent par renderEmail().
    return await send('admin_application', recipient, 'fr', data);
  }

  // Accusé de réception envoyé au candidat lui-même juste après sa
  // soumission sur seler-page.html — distinct de la notification interne
  // ci-dessus (qui part vers contact@ pour que l'équipe traite la demande).
  static async sendAdminApplicationConfirmation(application, lang) {
    return await send('application_received', application.email, lang, {
      user_name: `${application.firstName} ${application.lastName}`.trim(),
      button_url: `${FRONTEND_URL}/html/index.html`,
    });
  }

  // Confirmation envoyée au vendeur juste après la publication réussie
  // d'un produit (pas d'étape de modération admin actuellement — le
  // produit est déjà visible dès l'envoi de cet email).
  static async sendProductPublished(to, product, lang) {
    return await send('product_published', to, lang, {
      user_name: product.sellerName || 'Vendeur',
      product_name: product.name || 'Produit',
      product_price: `${(product.price || 0).toLocaleString()} ${product.currency || 'XOF'}`,
      button_url: `${FRONTEND_URL}/html/vendeur.html`,
    });
  }

  // Alerte l'équipe sécurité d'une nouvelle soumission de vérification
  // d'identité (KYC) à examiner — réutilise le template 'alert' déjà prêt.
  static async sendKycSubmissionAlert(kyc, user) {
    const adminEmail = process.env.EMAIL_FROM_SECURITY || 'security@sineshophome.com';
    const docLabels = { national_id: 'Carte nationale d\'identité', passport: 'Passeport', driver_license: 'Permis de conduire' };
    return await send('alert', adminEmail, 'fr', {
      user_name: 'Équipe SINE.SHOP',
      device: `Nouvelle demande de vérification d'identité — ${user.firstName} ${user.lastName} (${user.email}, rôle: ${user.role}). Document : ${docLabels[kyc.documentType] || kyc.documentType}.`,
      alert_date: new Date().toLocaleString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/administrateur.html`,
    });
  }

  // Notifie l'utilisateur lui-même de la décision prise sur sa vérification
  // d'identité — jusqu'ici, seule l'équipe interne était prévenue de la
  // soumission, jamais la personne concernée du résultat.
  static async sendKycApproved(to, name, role, lang) {
    return await send('kyc_approved', to, lang, {
      user_name: name || 'Utilisateur',
      button_url: `${FRONTEND_URL}/html/${spacePageForRole(role)}`,
    });
  }

  static async sendKycRejected(to, name, reviewNote, role, lang) {
    return await send('kyc_rejected', to, lang, {
      user_name: name || 'Utilisateur',
      review_note_html: reviewNote
        ? `<div style="background:#fef2f2;border-radius:12px;padding:14px 18px;"><p style="font-size:0.85rem;color:#991b1b;"><strong>Motif :</strong> ${reviewNote}</p></div>`
        : '',
      button_url: `${FRONTEND_URL}/html/${spacePageForRole(role)}`,
    });
  }

  // Alerte l'équipe d'une nouvelle demande de masquage/fermeture/suppression
  // de compte à examiner — réutilise le template 'alert' déjà prêt, comme
  // pour les soumissions KYC.
  // Confirmation immédiate à l'utilisateur que sa demande est bien reçue
  // et en cours de validation — n'existait pas du tout avant (seule
  // l'équipe admin était alertée). Expéditeur noreply@ comme demandé.
  static async sendAccountActionSubmittedConfirmation(user, request) {
    const labels = { hide_temporary: 'masquage temporaire', close: 'fermeture', delete_permanent: 'suppression définitive' };
    return await send('account_action_submitted', user.email, user.preferredLanguage, {
      user_name: user.firstName || 'Utilisateur',
      action_label: labels[request.requestType] || request.requestType,
      button_url: `${FRONTEND_URL}/html/login.html`,
    });
  }

  static async sendAccountActionRequestAlert(user, request) {
    const adminEmail = process.env.EMAIL_FROM_SECURITY || 'security@sineshophome.com';
    const labels = { hide_temporary: 'Masquage temporaire', close: 'Fermeture', delete_permanent: 'Suppression définitive' };
    return await send('alert', adminEmail, 'fr', {
      user_name: 'Équipe SINE.SHOP',
      device: `Nouvelle demande — ${labels[request.requestType] || request.requestType} — ${user.firstName} ${user.lastName} (${user.email}, rôle: ${user.role}).${request.reason ? ' Motif : ' + request.reason : ''}`,
      alert_date: new Date().toLocaleString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/administrateur.html`,
    });
  }

  // Notifie l'utilisateur de la décision prise sur sa demande — approuvée
  // ou refusée. Si le compte vient d'être supprimé, cet email est le
  // dernier qu'il recevra sur cette adresse.
  static async sendAccountActionDecision(to, name, requestType, decision, lang) {
    if (!to) return;
    const labels = { hide_temporary: 'masquage temporaire', close: 'fermeture', delete_permanent: 'suppression définitive' };
    const type = decision === 'approved' ? 'account_action_approved' : 'account_action_rejected';
    return await send(type, to, lang, {
      user_name: name || 'Utilisateur',
      action_label: labels[requestType] || requestType,
      button_url: `${FRONTEND_URL}/html/index.html`,
    });
  }

  // Notifie l'adresse de service dédiée (client/vendeur/livreur/affilié)
  // à chaque nouveau ticket — n'existait pas du tout avant (le ticket
  // restait uniquement en base, invisible tant qu'un admin n'allait pas
  // le chercher manuellement). Réutilise le type 'alert' déjà existant.
  static async sendTicketNotification(ticket, requester, serviceEmail) {
    const motifLabels = {
      probleme_commande: 'Problème de commande', probleme_paiement: 'Problème de paiement',
      probleme_livraison: 'Problème de livraison', probleme_compte: 'Problème de compte',
      probleme_produit: 'Problème de produit', signalement_abus: 'Signalement d\'abus',
      question_generale: 'Question générale', suggestion: 'Suggestion', autre: 'Autre',
    };
    const attachmentsList = (ticket.attachments || []).map((a) => a.url).join(', ') || 'Aucune';

    return await send('alert', serviceEmail, 'fr', {
      user_name: 'Équipe SINE.SHOP',
      device: `Nouveau ticket — Objet : "${ticket.subject}" — Motif : ${motifLabels[ticket.motif] || ticket.motif} — De : ${requester?.firstName || ''} ${requester?.lastName || ''} (${requester?.email}, rôle : ${requester?.role}).\nMessage : ${ticket.message}\nPièces jointes : ${attachmentsList}`,
      alert_date: new Date().toLocaleString('fr-FR'),
      button_url: `${FRONTEND_URL}/html/administrateur.html`,
    });
  }
}

// Fait correspondre le rôle actif d'un compte à sa page d'espace — utilisé
// pour que les liens d'email renvoient toujours au bon tableau de bord.
function spacePageForRole(role) {
  const pages = {
    client: 'client.html', seller: 'vendeur.html', livreur: 'livreur.html',
    affiliate: 'sineshopaffiliation.html', admin: 'administrateur.html',
    superadmin: 'superadministrateur.html', moderator: 'moderateur.html', support: 'support.html',
  };
  return pages[role] || 'client.html';
}

function SendersFallback() {
  return process.env.EMAIL_FROM_SUPPORT || 'support@sineshophome.com';
}

module.exports = EmailService;

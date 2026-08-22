const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const { cloudinary } = require('../config/cloudinary');
const AdminApplication = require('../models/AdminApplication');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/ApiError');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');

// =====================================================
// LIENS SIGNÉS POUR LES PIÈCES JOINTES — avant, l'email de notification
// pointait directement vers l'URL Cloudinary brute (res.cloudinary.com/...),
// visible dans la barre d'adresse au clic — pas très professionnel, et ça
// expose l'infrastructure de stockage. Ces liens passent maintenant par
// notre propre domaine (api.sineshophome.com/...), qui va chercher le
// fichier sur Cloudinary côté serveur et le sert directement dans le
// navigateur (Content-Disposition: inline) sans jamais rediriger vers
// Cloudinary. Signature HMAC (réutilise JWT_SECRET, aucune dépendance
// supplémentaire) + expiration — un clic depuis la messagerie fonctionne
// sans que l'admin ait besoin d'être déjà connecté au tableau de bord.
const FILE_LINK_SECRET = process.env.JWT_SECRET || 'sine-shop-fallback-secret';
const FILE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours — le temps de traiter la candidature

function signApplicationFileToken(applicationId, fileType, expiresAt) {
  const payload = `${applicationId}:${fileType}:${expiresAt}`;
  return crypto.createHmac('sha256', FILE_LINK_SECRET).update(payload).digest('hex');
}

function buildApplicationFileUrl(applicationId, fileType) {
  const expiresAt = Date.now() + FILE_LINK_TTL_MS;
  const sig = signApplicationFileToken(applicationId, fileType, expiresAt);
  const base = process.env.API_URL || 'https://api.sineshophome.com/api';
  return `${base}/applications/admin/${applicationId}/file/${fileType}?exp=${expiresAt}&sig=${sig}`;
}

// Nettoie une URL Cloudinary avant de la 'suivre' — s'assure qu'il s'agit
// bien d'une URL Cloudinary (pas un lien arbitraire injecté), pour éviter
// de transformer cet endpoint en relais ouvert vers n'importe quelle URL.
function isCloudinaryUrl(url) {
  return typeof url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(url);
}

// GET /api/applications/admin/:id/file/:type?exp=&sig= — PUBLIC (pas de
// connexion requise : c'est justement le but, un clic direct depuis
// l'email professionnel du Boss doit fonctionner sans étape de login) mais
// protégé par la signature + l'expiration, pas par un compte.
const viewApplicationFile = asyncHandler(async (req, res) => {
  const { id, type } = req.params;
  const { exp, sig } = req.query;

  if (!exp || !sig) throw new ForbiddenError('Lien invalide.');
  if (Date.now() > Number(exp)) throw new ForbiddenError('Ce lien a expiré.');

  const expectedSig = signApplicationFileToken(id, type, exp);
  if (sig !== expectedSig) throw new ForbiddenError('Lien invalide.');

  const application = await AdminApplication.findById(id);
  if (!application) throw new NotFoundError('Candidature introuvable.');

  const urlByType = {
    cv: application.cvUrl,
    letter: application.letterUrl,
    id: application.idUrl,
    proof: application.proofUrl,
  };
  const fileUrl = urlByType[type];
  if (!fileUrl || !isCloudinaryUrl(fileUrl)) throw new NotFoundError('Document introuvable.');

  https.get(fileUrl, (cloudinaryRes) => {
    if (cloudinaryRes.statusCode !== 200) {
      res.status(502).json({ success: false, message: 'Impossible de récupérer le document.' });
      return;
    }
    // 'inline' (pas 'attachment') — le fichier s'ouvre directement dans le
    // navigateur (PDF/image visible immédiatement) au lieu de forcer un
    // téléchargement, exactement le rendu "pro" demandé.
    res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    cloudinaryRes.pipe(res);
  }).on('error', (error) => {
    logger.error('Error proxying application file:', error);
    res.status(502).json({ success: false, message: 'Impossible de récupérer le document.' });
  });
});

// Envoie un fichier local (déposé par multer) vers Cloudinary et renvoie son
// URL sécurisée. Nettoie toujours le fichier temporaire, même en cas d'échec.
async function uploadToCloudinary(file, folder) {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } finally {
    fs.unlink(file.path, () => {});
  }
}

// POST /api/applications/admin — public (pas de compte requis pour postuler).
// Reçoit les champs du formulaire + jusqu'à 4 fichiers (cv, letter, idDocument,
// proof), les envoie sur Cloudinary, enregistre la candidature en base, et
// notifie contact@sineshophome.com avec tous les détails et les liens des
// documents.
const submitAdminApplication = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, email, phone, birthdate, gender, marital, children,
    address, city, country, education, experience, skills, motivation, terms,
    requestedRole,
  } = req.body;

  const VALID_REQUESTED_ROLES = ['admin', 'superadmin', 'finance_admin', 'moderator', 'support'];
  const finalRequestedRole = VALID_REQUESTED_ROLES.includes(requestedRole) ? requestedRole : 'admin';

  const required = { firstName, lastName, email, phone, birthdate, gender, address, city, country, education, experience, motivation };
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new BadRequestError(`Le champ "${key}" est obligatoire.`);
    }
  }

  if (terms !== 'true' && terms !== true) {
    throw new BadRequestError('Vous devez accepter les conditions pour continuer.');
  }

  const files = req.files || {};
  if (!files.cv || !files.cv[0]) {
    throw new BadRequestError('Le CV est obligatoire.');
  }
  if (!files.idDocument || !files.idDocument[0]) {
    throw new BadRequestError('La pièce d\'identité est obligatoire.');
  }

  const [cvUrl, letterUrl, idUrl, proofUrl] = await Promise.all([
    uploadToCloudinary(files.cv[0], 'admin-applications/cv'),
    files.letter && files.letter[0] ? uploadToCloudinary(files.letter[0], 'admin-applications/letters') : Promise.resolve(undefined),
    uploadToCloudinary(files.idDocument[0], 'admin-applications/id'),
    files.proof && files.proof[0] ? uploadToCloudinary(files.proof[0], 'admin-applications/proof') : Promise.resolve(undefined),
  ]);

  const application = await AdminApplication.create({
    firstName, lastName, email, phone, birthdate, gender, marital, children,
    address, city, country, education, experience, skills, motivation,
    cvUrl, letterUrl, idUrl, proofUrl,
    requestedRole: finalRequestedRole,
  });

  let notificationEmailSent = false;
  try {
    await EmailService.sendAdminApplicationNotification(application);
    notificationEmailSent = true;
  } catch (error) {
    logger.error('Error sending admin application notification:', error);
  }

  // Accusé de réception envoyé au candidat lui-même — distinct de la
  // notification interne ci-dessus (destinée à contact@sineshophome.com).
  try {
    await EmailService.sendAdminApplicationConfirmation(application);
  } catch (error) {
    logger.error('Error sending admin application confirmation:', error);
  }

  sendCreatedApplication(res, application, notificationEmailSent);
});

function sendCreatedApplication(res, application, notificationEmailSent) {
  sendCreated(res, {
    id: application._id,
    status: application.status,
    notificationEmailSent,
  }, notificationEmailSent
    ? 'Application submitted successfully'
    : 'Application saved, but the internal notification email could not be sent');
}

// GET /api/applications/admin — réservé aux admins, pour la file d'attente
// de candidatures (côté administrateur.html).
const getAdminApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const applications = await AdminApplication.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, applications, 'Applications retrieved');
});

module.exports = {
  submitAdminApplication,
  getAdminApplications,
  viewApplicationFile,
  buildApplicationFileUrl,
};

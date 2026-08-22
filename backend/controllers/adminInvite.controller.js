const crypto = require('crypto');
const AdminInvite = require('../models/AdminInvite');
const AdminApplication = require('../models/AdminApplication');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError } = require('../utils/ApiError');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.sineshophome.com';

// POST /api/admin-invites — réservé au superadmin (seul rôle habilité à
// distribuer des accès à privilèges). Génère un lien nominatif, à usage
// unique, pour UN rôle précis — à copier/coller soi-même dans une réponse
// depuis sa messagerie professionnelle (le système n'envoie rien lui-même :
// ces boîtes mail pro ne sont pas connectées à SINE.SHOP).
const createAdminInvite = asyncHandler(async (req, res) => {
  const { role, email, applicationId } = req.body;

  const VALID_ROLES = ['admin', 'superadmin', 'moderator', 'support', 'finance_admin'];
  if (!VALID_ROLES.includes(role)) {
    throw new BadRequestError('Rôle invalide.');
  }

  if (applicationId) {
    const application = await AdminApplication.findById(applicationId);
    if (!application) throw new NotFoundError('Candidature introuvable.');
  }

  const token = crypto.randomBytes(32).toString('hex');

  const invite = await AdminInvite.create({
    token,
    role,
    email: email ? String(email).trim().toLowerCase() : undefined,
    application: applicationId || undefined,
    createdBy: req.user.id,
  });

  const inviteUrl = `${FRONTEND_URL}/html/registeradministrateur.html?invite=${token}`;

  sendCreated(res, { invite, inviteUrl }, 'Lien d\'invitation généré avec succès');
});

// GET /api/admin-invites/:token — PUBLIC (la personne invitée n'a pas encore
// de compte) : vérifie que le lien est valide et renvoie le rôle/email
// prévus, pour que registeradministrateur.html les pré-remplisse et les
// verrouille (impossible de choisir un autre rôle que celui approuvé).
const getInviteByToken = asyncHandler(async (req, res) => {
  const invite = await AdminInvite.findOne({ token: req.params.token });
  if (!invite) throw new NotFoundError('Ce lien d\'invitation n\'existe pas.');
  if (invite.isUsed) throw new BadRequestError('Ce lien d\'invitation a déjà été utilisé.');
  if (invite.expiresAt < new Date()) throw new BadRequestError('Ce lien d\'invitation a expiré.');

  sendSuccess(res, { role: invite.role, email: invite.email || null }, 'Invitation valide');
});

// Réservé au superadmin — liste des invitations émises (suivi : utilisées,
// en attente, expirées).
const listAdminInvites = asyncHandler(async (req, res) => {
  const invites = await AdminInvite.find()
    .sort({ createdAt: -1 })
    .populate('createdBy', 'firstName lastName email')
    .populate('application', 'firstName lastName email')
    .limit(100);
  sendSuccess(res, invites, 'Invitations récupérées');
});

module.exports = {
  createAdminInvite,
  getInviteByToken,
  listAdminInvites,
};

const OfficialUser = require('../models/OfficialUser');
const { generateToken } = require('../config/jwt');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, UnauthorizedError } = require('../utils/ApiError');

const MAX_OFFICIAL_USERS = 6;

// POST /api/official-auth/register — max 6 comptes, imposé ICI côté
// serveur (avant : seulement une vérification JS côté navigateur,
// contournable en une ligne de console). Mots de passe hachés (bcrypt,
// voir OfficialUser.js) — avant : stockés en clair dans localStorage.
const registerOfficial = asyncHandler(async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || username.trim().length < 3) {
    throw new BadRequestError('L\'identifiant doit faire au moins 3 caractères.');
  }
  if (!password || password.length < 6) {
    throw new BadRequestError('Le mot de passe doit faire au moins 6 caractères.');
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new BadRequestError('Les mots de passe ne correspondent pas.');
  }

  const count = await OfficialUser.countDocuments();
  if (count >= MAX_OFFICIAL_USERS) {
    throw new BadRequestError(`Nombre maximum d'utilisateurs atteint (${MAX_OFFICIAL_USERS}).`);
  }

  const existing = await OfficialUser.findOne({ username: username.trim() });
  if (existing) {
    throw new BadRequestError('Cet identifiant existe déjà.');
  }

  // Le tout premier compte créé devient automatiquement "owner" (le Boss) —
  // les suivants sont de simples "admin" du Centre Officiel.
  const role = count === 0 ? 'owner' : 'admin';

  const officialUser = await OfficialUser.create({
    username: username.trim(),
    password,
    role,
  });

  const token = generateToken(officialUser._id, 'official');

  sendCreated(res, {
    token,
    user: { id: officialUser._id, username: officialUser.username, role: officialUser.role },
  }, 'Compte créé avec succès');
});

// POST /api/official-auth/login — mot de passe vérifié par bcrypt (avant :
// comparaison de chaînes en clair dans le JS du navigateur). Le token émis
// porte role:'official', jamais utilisable sur aucune autre route du site.
const loginOfficial = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new BadRequestError('Identifiant et mot de passe requis.');
  }

  const officialUser = await OfficialUser.findOne({ username: username.trim() }).select('+password');
  if (!officialUser) {
    throw new UnauthorizedError('Identifiant ou mot de passe incorrect.');
  }

  const isMatch = await officialUser.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Identifiant ou mot de passe incorrect.');
  }

  const token = generateToken(officialUser._id, 'official');

  sendSuccess(res, {
    token,
    user: { id: officialUser._id, username: officialUser.username, role: officialUser.role },
  }, 'Connexion réussie');
});

// GET /api/official-auth/count — public, uniquement le NOMBRE de comptes
// (jamais leur identité) pour afficher "X/6 utilisateurs" sur l'écran de
// connexion sans exposer d'information sensible.
const getOfficialUserCount = asyncHandler(async (req, res) => {
  const count = await OfficialUser.countDocuments();
  sendSuccess(res, { count, max: MAX_OFFICIAL_USERS });
});

module.exports = { registerOfficial, loginOfficial, getOfficialUserCount };

const User = require('../models/User');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, UnauthorizedError, BadRequestError } = require('../utils/ApiError');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');
  sendSuccess(res, user.getPublicProfile(), 'Profil récupéré avec succès');
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  const { password, role, email, isVerified, status, ...allowed } = req.body;

  const lockedFieldsIgnored = [];
  const JOUR = 24 * 60 * 60 * 1000;

  ['dateOfBirth', 'preferredCurrency'].forEach((field) => {
    if (field in allowed && user[field]) {
      delete allowed[field];
      lockedFieldsIgnored.push(field);
    }
  });

  function joursRestants(lastChangedAt, cooldownJours) {
    if (!lastChangedAt) return 0;
    const ecouleMs = Date.now() - new Date(lastChangedAt).getTime();
    const resteMs = cooldownJours * JOUR - ecouleMs;
    return resteMs > 0 ? Math.ceil(resteMs / JOUR) : 0;
  }

  if ('firstName' in allowed || 'lastName' in allowed) {
    const reste = joursRestants(user.nameChangedAt, 30);
    if (reste > 0) {
      delete allowed.firstName;
      delete allowed.lastName;
      lockedFieldsIgnored.push(`firstName/lastName (encore ${reste} jour(s))`);
    } else {
      allowed.nameChangedAt = new Date();
    }
  }

  if ('pseudo' in allowed) {
    const reste = joursRestants(user.pseudoChangedAt, 14);
    if (reste > 0) {
      delete allowed.pseudo;
      lockedFieldsIgnored.push(`pseudo (encore ${reste} jour(s))`);
    } else {
      allowed.pseudoChangedAt = new Date();
    }
  }

  if ('phone' in allowed) {
    const reste = joursRestants(user.phoneChangedAt, 3);
    if (reste > 0) {
      delete allowed.phone;
      lockedFieldsIgnored.push(`phone (encore ${reste} jour(s))`);
    } else {
      allowed.phoneChangedAt = new Date();
      allowed.isPhoneVerified = false;
    }
  }

  if (allowed.pseudo) {
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(allowed.pseudo)) {
      throw new BadRequestError('Le pseudonyme doit contenir 3 à 24 caractères (lettres, chiffres, underscore).');
    }
    const pseudoTaken = await User.findOne({ pseudo: allowed.pseudo, _id: { $ne: user._id } });
    if (pseudoTaken) throw new BadRequestError('Ce pseudonyme est déjà pris.');
  }

  const COUNTRY_CURRENCY = {
    CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF', BJ: 'XOF', TG: 'XOF', NE: 'XOF', GN: 'XOF',
    CM: 'XOF', GA: 'XOF', TD: 'XOF', CG: 'XOF',
    NG: 'NGN', GH: 'NGN', MA: 'MAD', ZA: 'NGN', EG: 'MAD',
    FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', BE: 'EUR', PT: 'EUR', CH: 'EUR',
    US: 'USD', AE: 'USD', SA: 'USD', IN: 'USD',
    GB: 'GBP', CA: 'CAD',
    "ivory coast": 'XOF', "côte d'ivoire": 'XOF', 'senegal': 'XOF', 'sénégal': 'XOF',
    'mali': 'XOF', 'burkina faso': 'XOF', 'benin': 'XOF', 'bénin': 'XOF', 'togo': 'XOF',
    'niger': 'XOF', 'guinea': 'XOF', 'guinée': 'XOF', 'cameroon': 'XOF', 'cameroun': 'XOF',
    'nigeria': 'NGN', 'ghana': 'NGN', 'morocco': 'MAD', 'maroc': 'MAD', 'egypt': 'MAD', 'égypte': 'MAD',
    'france': 'EUR', 'germany': 'EUR', 'allemagne': 'EUR', 'spain': 'EUR', 'espagne': 'EUR',
    'italy': 'EUR', 'italie': 'EUR', 'belgium': 'EUR', 'belgique': 'EUR', 'portugal': 'EUR', 'switzerland': 'EUR',
    'united states': 'USD', 'états-unis': 'USD', 'united arab emirates': 'USD', 'saudi arabia': 'USD', 'india': 'USD',
    'united kingdom': 'GBP', 'royaume-uni': 'GBP', 'canada': 'CAD',
  };
  const resolveCurrencyForCountry = (country) => COUNTRY_CURRENCY[country] || COUNTRY_CURRENCY[country?.toLowerCase?.()];

  if (allowed.address && typeof allowed.address === 'object') {
    const currentAddress = user.address || {};
    const newCountry = allowed.address.country;
    const countryChanged = newCountry && newCountry !== currentAddress.country;

    user.address = { ...currentAddress.toObject?.() ?? currentAddress, ...allowed.address };
    delete allowed.address;

    const resolvedCurrency = countryChanged ? resolveCurrencyForCountry(newCountry) : null;
    if (resolvedCurrency) user.preferredCurrency = resolvedCurrency;
  }

  if (allowed.socialLinks && typeof allowed.socialLinks === 'object') {
    const currentSocial = user.socialLinks || {};
    user.socialLinks = { ...currentSocial.toObject?.() ?? currentSocial, ...allowed.socialLinks };
    delete allowed.socialLinks;
  }

  Object.assign(user, allowed);
  await user.save();

  const profile = user.getPublicProfile();
  sendSuccess(res, { ...profile, lockedFieldsIgnored }, 'Profil mis à jour avec succès');
});

// =====================================================
// VALIDATION DU NUMÉRO — AVEC WHATSAPP PRIORITY
// =====================================================

exports.requestPhoneVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');
  if (!user.phone) throw new BadRequestError('Aucun numéro de téléphone enregistré sur ce compte.');
  if (user.isPhoneVerified) throw new BadRequestError('Ce numéro est déjà validé.');

  const Verification = require('../models/Verification');
  const SMSService = require('../services/sms.service');

  await Verification.deleteMany({ user: user._id, type: 'phone', isUsed: false });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await Verification.create({ user: user._id, code, type: 'phone' });

  try {
    // =========================================================
    // ✅ WHATSAPP PRIORITY — Envoi du code de vérification
    // =========================================================
    await SMSService.sendVerification(user.phone, code, user.firstName);
    logger.info(`📱 Code de validation envoyé à ${user.phone} (WhatsApp prioritaire)`);
  } catch (error) {
    logger.error('Error sending verification SMS/WhatsApp:', error);
    throw new BadRequestError('Impossible d\'envoyer le code de validation. Vérifiez le numéro ou réessayez.');
  }

  sendSuccess(res, { phone: user.phone }, 'Code de validation envoyé par SMS/WhatsApp.');
});

exports.confirmPhoneVerification = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new BadRequestError('Code requis.');

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  const Verification = require('../models/Verification');
  const verification = await Verification.findOne({ user: user._id, type: 'phone', isUsed: false }).sort({ createdAt: -1 });
  if (!verification) throw new BadRequestError('Aucune demande de validation en cours.');
  if (verification.isExpired()) throw new BadRequestError('Code expiré — redemandez-en un nouveau.');
  if (verification.isBlocked()) throw new BadRequestError('Trop de tentatives — redemandez un nouveau code.');
  if (verification.code !== String(code).trim()) {
    await verification.incrementAttempts();
    throw new BadRequestError('Code incorrect.');
  }

  verification.isUsed = true;
  await verification.save();

  user.isPhoneVerified = true;
  await user.save();

  sendSuccess(res, { isPhoneVerified: true }, 'Numéro validé avec succès.');
});

// =====================================================
// CHANGEMENT D'EMAIL
// =====================================================

exports.requestEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
    throw new BadRequestError('Adresse email invalide.');
  }
  const email = newEmail.trim().toLowerCase();

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  if (email === user.email) throw new BadRequestError('C\'est déjà votre adresse actuelle.');

  if (user.emailChangedAt) {
    const ecouleMs = Date.now() - new Date(user.emailChangedAt).getTime();
    const resteJours = Math.ceil((30 * 24 * 60 * 60 * 1000 - ecouleMs) / (24 * 60 * 60 * 1000));
    if (resteJours > 0) {
      throw new BadRequestError(`Vous pourrez changer d'adresse email dans ${resteJours} jour(s).`);
    }
  }

  const taken = await User.findOne({ email, _id: { $ne: user._id } });
  if (taken) throw new BadRequestError('Cette adresse email est déjà utilisée par un autre compte.');

  const Verification = require('../models/Verification');
  const EmailService = require('../services/email.service');

  await Verification.deleteMany({ user: user._id, type: 'email_change', isUsed: false });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await Verification.create({
    user: user._id,
    code,
    type: 'email_change',
    metadata: { newEmail: email },
  });

  await EmailService.sendVerification(email, code, user.firstName, user.preferredLanguage);

  sendSuccess(res, null, 'Code de confirmation envoyé à la nouvelle adresse email.');
});

exports.confirmEmailChange = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new BadRequestError('Code requis.');

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  const Verification = require('../models/Verification');
  const verification = await Verification.findOne({ user: user._id, type: 'email_change', isUsed: false }).sort({ createdAt: -1 });
  if (!verification) throw new BadRequestError('Aucune demande de changement d\'email en cours.');
  if (verification.isExpired()) throw new BadRequestError('Code expiré — recommencez la demande.');
  if (verification.isBlocked()) throw new BadRequestError('Trop de tentatives — recommencez la demande.');
  if (verification.code !== String(code).trim()) {
    await verification.incrementAttempts();
    throw new BadRequestError('Code incorrect.');
  }

  const newEmail = verification.metadata?.get ? verification.metadata.get('newEmail') : verification.metadata?.newEmail;
  if (!newEmail) throw new BadRequestError('Demande invalide — recommencez.');

  verification.isUsed = true;
  await verification.save();

  user.email = newEmail;
  user.emailChangedAt = new Date();
  await user.save();

  sendSuccess(res, { email: user.email }, 'Adresse email mise à jour avec succès.');
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'Mot de passe actuel et nouveau mot de passe requis');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new NotFoundError('Utilisateur introuvable');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new UnauthorizedError('Mot de passe actuel incorrect');

  user.password = newPassword;
  user.passwordSetByUser = true;
  await user.save();

  sendSuccess(res, null, 'Mot de passe mis à jour avec succès');
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('Utilisateur introuvable');
  await user.deleteOne();
  sendSuccess(res, null, 'Compte supprimé avec succès');
});

exports.getAvailableLivreurs = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { role: 'livreur', isAvailable: true };
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }
  const livreurs = await User.find(filter)
    .select('firstName lastName profilePicture vehicleType rating address.city')
    .limit(20);
  sendSuccess(res, livreurs, 'Livreurs disponibles récupérés');
});
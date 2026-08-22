const crypto = require('crypto');
const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const Verification = require('../models/Verification');
const AdminInvite = require('../models/AdminInvite');
const AccountActionRequest = require('../models/AccountActionRequest');
const logger = require('../utils/logger');
const { generateToken, generateRefreshToken, generateVerificationCode } = require('../utils/generateToken');
const { sendResponse, sendSuccess, sendCreated, sendError } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiError, BadRequestError, UnauthorizedError, NotFoundError, ForbiddenError } = require('../utils/ApiError');
const { validateEmail, validatePhone, validatePassword } = require('../utils/validator');
const EmailService = require('../services/email.service');
const SMSService = require('../services/sms.service');
const { verifyIdToken } = require('../config/firebase');

const PRIVILEGED_ROLES = ['admin', 'superadmin', 'moderator', 'support', 'finance_admin'];

// =====================================================
// GERE UN COMPTE MASQUÉ TEMPORAIREMENT
// =====================================================
async function handleHiddenAccountLogin(user) {
  const pendingHide = await AccountActionRequest.findOne({
    user: user._id,
    requestType: 'hide_temporary',
    status: 'pending',
  });

  const stillInWindow = pendingHide && pendingHide.selfReconnectDeadline && pendingHide.selfReconnectDeadline > new Date();
  if (stillInWindow) {
    user.accountStatus = 'active';
    await user.save();
    pendingHide.status = 'rejected';
    pendingHide.reviewNote = 'Annulée automatiquement — reconnexion dans le délai de 30 jours.';
    pendingHide.reviewedAt = new Date();
    await pendingHide.save();
    return;
  }

  if (user.role === 'affiliate') {
    if (pendingHide) {
      pendingHide.status = 'approved';
      pendingHide.reviewNote = 'Suppression automatique — compte affilié non réactivé dans le délai de 30 jours (aucune intervention admin requise pour ce rôle).';
      pendingHide.reviewedAt = new Date();
      await pendingHide.save();
    }
    const email = user.email;
    const firstName = user.firstName;
    const lang = user.preferredLanguage;
    await User.findByIdAndDelete(user._id);
    try {
      await EmailService.sendAccountActionDecision(email, firstName, 'delete_permanent', 'approved', lang);
    } catch (error) {
      logger.error('Error sending affiliate auto-deletion email:', error);
    }
    throw new UnauthorizedError('Ce compte affilié a été automatiquement supprimé après 30 jours sans reconnexion.');
  }

  throw new UnauthorizedError('Le délai de 30 jours pour réactiver ce compte vous-même est dépassé. Un administrateur examine votre demande.');
}

// =====================================================
// NORMALISATION DES IDENTIFIANTS
// =====================================================
function normalizePhoneVariants(value) {
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [];
  return [...new Set([raw, digits, `+${digits}`])];
}

function significantPhoneSuffix(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.slice(-8);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function buildIdentifierQuery(value) {
  const email = normalizeEmail(value);
  const phones = normalizePhoneVariants(value);
  const suffix = significantPhoneSuffix(value);
  const clauses = [];
  if (email && email.includes('@')) clauses.push({ email });
  phones.forEach((phone) => clauses.push({ phone }));
  if (suffix) clauses.push({ phone: { $regex: suffix + '$' } });
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed && !trimmed.includes('@') && !/^[+\d][\d\s().-]*$/.test(trimmed)) {
    clauses.push({ pseudo: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  }
  return clauses.length ? { $or: clauses } : null;
}

// =====================================================
// INSCRIPTION — AVEC WHATSAPP PRIORITY
// =====================================================
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, role, adminCode, inviteToken, referralCode, birthdate, ...rest } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  const normalizedPhone = typeof phone === 'string' ? phone.replace(/[\s().-]/g, '') : phone;

  // Validations
  if (!firstName || !lastName || !normalizedEmail || !normalizedPhone || !password) {
    throw new BadRequestError('All fields are required');
  }

  const openRoles = ['client', 'seller', 'livreur', 'affiliate'];
  const privilegedRoles = ['admin', 'superadmin', 'moderator', 'support', 'finance_admin'];
  let finalRole = 'client';
  let inviteUsed = null;

  if (openRoles.includes(role)) {
    finalRole = role;
  } else if (privilegedRoles.includes(role)) {
    if (inviteToken) {
      const invite = await AdminInvite.findOne({ token: inviteToken });
      if (!invite) throw new UnauthorizedError('Invalid invitation link');
      if (invite.isUsed) throw new UnauthorizedError('This invitation has already been used');
      if (invite.expiresAt < new Date()) throw new UnauthorizedError('This invitation has expired');
      if (invite.email && invite.email !== normalizedEmail) {
        throw new UnauthorizedError('This invitation was issued for a different email address');
      }
      finalRole = invite.role;
      inviteUsed = invite;
    } else if (role !== 'finance_admin' && process.env.ADMIN_REGISTRATION_CODE && adminCode === process.env.ADMIN_REGISTRATION_CODE) {
      finalRole = role;
    } else {
      throw new UnauthorizedError('Invalid administration code or invitation link');
    }
  }

  if (!validateEmail(normalizedEmail)) {
    throw new BadRequestError('Invalid email format');
  }

  if (!validatePhone(normalizedPhone)) {
    throw new BadRequestError('Invalid phone number format');
  }

  if (!validatePassword(password)) {
    throw new BadRequestError('Password must be at least 6 characters with uppercase, lowercase and number');
  }

  const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
  if (existingUser) {
    throw new BadRequestError('User already exists with this email or phone. If you already have an account, log in and use "add a role" from your account settings instead of registering again.');
  }

  // Âge minimum
  const MIN_AGE_BY_ROLE = {
    seller: 18,
    livreur: 18,
    client: 17,
    affiliate: 17,
    admin: 24,
    superadmin: 24,
    moderator: 24,
    support: 24,
    finance_admin: 24,
  };
  const minAge = MIN_AGE_BY_ROLE[finalRole];
  if (minAge) {
    if (!birthdate) {
      throw new BadRequestError('Date of birth is required.');
    }
    const dob = new Date(birthdate);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestError('Invalid date of birth.');
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }
    if (age < minAge) {
      throw new BadRequestError(`You must be at least ${minAge} years old to create this type of account.`);
    }
  }

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
    passwordSetByUser: true,
    role: finalRole,
    birthdate: birthdate || undefined,
    ...rest,
  });

  if (inviteUsed) {
    inviteUsed.isUsed = true;
    inviteUsed.usedAt = new Date();
    inviteUsed.createdAccount = user._id;
    await inviteUsed.save();
  }

  // Code de parrainage
  if (referralCode) {
    try {
      const referrer = await User.findOne({ affiliateCode: referralCode.toUpperCase().trim() });
      if (referrer && referrer._id.toString() !== user._id.toString()) {
        user.referredBy = referrer._id;
        await user.save();
        const affiliateDoc = await Affiliate.findOne({ user: referrer._id });
        if (affiliateDoc) {
          affiliateDoc.referrals.push({
            user: user._id,
            date: new Date(),
            orderTotal: 0,
            commission: 50,
            status: 'pending',
          });
          await affiliateDoc.save();
        }
      }
    } catch (referralError) {
      console.error('Error processing referral code:', referralError);
    }
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await Verification.deleteMany({
    user: user._id,
    type: { $in: ['email', 'phone'] },
    isUsed: false,
  });

  await Verification.create([
    { user: user._id, code, type: 'email', expiresAt },
    { user: user._id, code, type: 'phone', expiresAt },
  ]);

  // =========================================================
  // ✅ WHATSAPP PRIORITY — Envoi du code de vérification
  // =========================================================
  try {
    await SMSService.sendVerification(normalizedPhone, code, firstName);
    logger.info(`📱 Code de vérification envoyé à ${normalizedPhone} (WhatsApp prioritaire)`);
  } catch (error) {
    logger.error('Error sending verification SMS/WhatsApp:', error);
  }

  try {
    await EmailService.sendVerification(normalizedEmail, code, firstName, user.preferredLanguage);
  } catch (error) {
    console.error('Error sending verification email:', error);
  }

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendCreated(res, {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
    refreshToken,
  }, 'User registered successfully');
});

// =====================================================
// CONNEXION
// =====================================================
const login = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginIdentifier = typeof (identifier || email) === 'string' ? (identifier || email).trim() : (identifier || email);

  if (!loginIdentifier || !password) {
    throw new BadRequestError('Email/phone and password are required');
  }

  const identifierQuery = buildIdentifierQuery(loginIdentifier);
  if (!identifierQuery) {
    throw new BadRequestError('A valid email address or phone number is required');
  }

  const user = await User.findOne(identifierQuery).select('+password +securityCode');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    if (user.firebaseUid && user.passwordSetByUser !== true) {
      throw new UnauthorizedError('Ce compte a été créé avec Google/Facebook et n\'a pas de mot de passe. Connectez-vous avec Google, ou utilisez "Mot de passe oublié" pour en définir un.');
    }
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.status === 'suspended') {
    throw new UnauthorizedError('Account suspended');
  }

  if (user.accountStatus === 'hidden') {
    await handleHiddenAccountLogin(user);
  } else if (user.accountStatus && user.accountStatus !== 'active') {
    const accountStatusMessages = {
      closed: 'Votre compte a été fermé à votre demande.',
      pending_deletion: 'Votre compte est en cours de suppression suite à votre demande.',
    };
    throw new UnauthorizedError(accountStatusMessages[user.accountStatus] || 'Ce compte n\'est plus accessible.');
  }

  if (PRIVILEGED_ROLES.includes(user.role) && user.securityCode) {
    return sendSuccess(res, {
      securityCodeRequired: true,
    }, 'Password verified — security code required');
  }

  user.lastLogin = new Date();
  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
    },
    token,
    refreshToken,
    mustSetSecurityCode: PRIVILEGED_ROLES.includes(user.role) && !user.securityCode,
  }, 'Login successful');
});

// =====================================================
// CODE DE CONFIDENTIALITÉ
// =====================================================
const SECURITY_CODE_MAX_ATTEMPTS = 5;
const SECURITY_CODE_LOCK_MINUTES = 15;

const verifySecurityCode = asyncHandler(async (req, res) => {
  const { identifier, email, code } = req.body;
  const loginIdentifier = identifier || email;

  if (!loginIdentifier || !code) {
    throw new BadRequestError('Email/phone and security code are required');
  }

  const identifierQuery = buildIdentifierQuery(String(loginIdentifier));
  if (!identifierQuery) throw new BadRequestError('A valid email address or phone number is required');

  const user = await User.findOne(identifierQuery).select('+securityCode +securityCodeFailedAttempts +securityCodeLockedUntil');
  if (!user || !PRIVILEGED_ROLES.includes(user.role) || !user.securityCode) {
    throw new UnauthorizedError('Invalid request');
  }

  if (user.securityCodeLockedUntil && user.securityCodeLockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.securityCodeLockedUntil - new Date()) / 60000);
    throw new UnauthorizedError(`Trop de tentatives. Réessayez dans ${minutesLeft} minute(s).`);
  }

  const isCodeMatch = await user.compareSecurityCode(code);
  if (!isCodeMatch) {
    user.securityCodeFailedAttempts = (user.securityCodeFailedAttempts || 0) + 1;
    if (user.securityCodeFailedAttempts >= SECURITY_CODE_MAX_ATTEMPTS) {
      user.securityCodeLockedUntil = new Date(Date.now() + SECURITY_CODE_LOCK_MINUTES * 60 * 1000);
      user.securityCodeFailedAttempts = 0;
      await user.save();
      throw new UnauthorizedError(`Trop de tentatives. Compte verrouillé ${SECURITY_CODE_LOCK_MINUTES} minutes.`);
    }
    await user.save();
    throw new UnauthorizedError('Invalid security code');
  }

  user.securityCodeFailedAttempts = 0;
  user.securityCodeLockedUntil = undefined;
  await user.save();

  if (user.status === 'suspended') {
    throw new UnauthorizedError('Account suspended');
  }

  if (user.accountStatus === 'hidden') {
    await handleHiddenAccountLogin(user);
  } else if (user.accountStatus && user.accountStatus !== 'active') {
    const accountStatusMessages = {
      closed: 'Votre compte a été fermé à votre demande.',
      pending_deletion: 'Votre compte est en cours de suppression suite à votre demande.',
    };
    throw new UnauthorizedError(accountStatusMessages[user.accountStatus] || 'Ce compte n\'est plus accessible.');
  }

  await Verification.deleteMany({ user: user._id, type: 'two_factor', isUsed: false });
  const otp = generateVerificationCode();
  await Verification.create({
    user: user._id,
    code: otp,
    type: 'two_factor',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  try {
    await EmailService.sendVerification(user.email, otp, user.firstName, user.preferredLanguage);
  } catch (mailError) {
    console.error('Error sending 2FA OTP email:', mailError);
  }

  sendSuccess(res, {
    securityOtpRequired: true,
  }, 'Security code verified — OTP sent to your administrative email');
});

const verifySecurityOtp = asyncHandler(async (req, res) => {
  const { identifier, email, otp } = req.body;
  const loginIdentifier = identifier || email;

  if (!loginIdentifier || !otp) {
    throw new BadRequestError('Email/phone and OTP are required');
  }

  const identifierQuery = buildIdentifierQuery(String(loginIdentifier));
  if (!identifierQuery) throw new BadRequestError('A valid email address or phone number is required');

  const user = await User.findOne(identifierQuery);
  if (!user || !PRIVILEGED_ROLES.includes(user.role)) {
    throw new UnauthorizedError('Invalid request');
  }

  const verification = await Verification.findOne({
    user: user._id,
    type: 'two_factor',
    code: otp,
    isUsed: false,
  });

  if (!verification || verification.isExpired()) {
    throw new UnauthorizedError('Code invalide ou expiré.');
  }

  verification.isUsed = true;
  await verification.save();

  user.lastLogin = new Date();
  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
    },
    token,
    refreshToken,
  }, 'Login successful');
});

const setSecurityCode = asyncHandler(async (req, res) => {
  const { password, newCode } = req.body;

  if (!password || !newCode) {
    throw new BadRequestError('Password and new security code are required');
  }

  if (!/^\d{4,8}$/.test(newCode)) {
    throw new BadRequestError('Security code must be 4 to 8 digits');
  }

  const user = await User.findById(req.user.id).select('+password +securityCode');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!PRIVILEGED_ROLES.includes(user.role)) {
    throw new UnauthorizedError('This account type cannot set a security code');
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw new UnauthorizedError('Invalid password');
  }

  user.securityCode = newCode;
  await user.save();

  sendSuccess(res, null, 'Security code updated successfully');
});

// =====================================================
// CODE DE CONFIDENTIALITÉ OUBLIÉ
// =====================================================
const SECURITY_CODE_RESET_SECRET = process.env.JWT_SECRET || 'sine-shop-fallback-secret';
const SECURITY_CODE_RESET_TTL_MS = 10 * 60 * 1000;

function signSecurityCodeResetToken(userId, expiresAt) {
  return crypto.createHmac('sha256', SECURITY_CODE_RESET_SECRET).update(`seccode-reset:${userId}:${expiresAt}`).digest('hex');
}

const forgotSecurityCode = asyncHandler(async (req, res) => {
  const { identifier, email } = req.body;
  const loginIdentifier = identifier || email;
  if (!loginIdentifier) throw new BadRequestError('Email ou téléphone requis.');

  const identifierQuery = buildIdentifierQuery(String(loginIdentifier));
  const user = identifierQuery ? await User.findOne(identifierQuery) : null;

  if (user && PRIVILEGED_ROLES.includes(user.role) && user.securityCode) {
    const expiresAt = Date.now() + SECURITY_CODE_RESET_TTL_MS;
    const sig = signSecurityCodeResetToken(user._id, expiresAt);
    const resetUrl = `${process.env.FRONTEND_URL || 'https://www.sineshophome.com'}/html/login.html?resetSecurityCode=1&uid=${user._id}&exp=${expiresAt}&sig=${sig}`;

    try {
      await EmailService.sendSecurityCodeResetLink(user.email, resetUrl, user.firstName, user.preferredLanguage);
    } catch (mailError) {
      console.error('Error sending security code reset email:', mailError);
    }
  }

  sendSuccess(res, null, 'Si ce compte existe, un email de réinitialisation a été envoyé.');
});

const resetSecurityCode = asyncHandler(async (req, res) => {
  const { userId, exp, sig, newCode } = req.body;

  if (!userId || !exp || !sig || !newCode) {
    throw new BadRequestError('Lien invalide.');
  }
  if (!/^\d{4,8}$/.test(newCode)) {
    throw new BadRequestError('Security code must be 4 to 8 digits');
  }
  if (Date.now() > Number(exp)) {
    throw new UnauthorizedError('Ce lien a expiré.');
  }
  const expectedSig = signSecurityCodeResetToken(userId, exp);
  if (sig !== expectedSig) {
    throw new UnauthorizedError('Lien invalide.');
  }

  const user = await User.findById(userId);
  if (!user || !PRIVILEGED_ROLES.includes(user.role)) {
    throw new UnauthorizedError('Invalid request');
  }

  user.securityCode = newCode;
  user.securityCodeFailedAttempts = 0;
  user.securityCodeLockedUntil = undefined;
  await user.save();

  sendSuccess(res, null, 'Code de confidentialité réinitialisé avec succès.');
});

// =====================================================
// SWITCH / ADD ROLE
// =====================================================
const SWITCHABLE_ROLES = ['client', 'seller', 'livreur', 'affiliate'];
const ADDABLE_ROLES = ['seller', 'livreur', 'affiliate'];

const switchRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!SWITCHABLE_ROLES.includes(role)) {
    throw new BadRequestError('Invalid role');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.roles.includes(role)) {
    throw new ForbiddenError('You do not have this role on your account yet — use add-role first');
  }

  user.role = role;
  user.lastLogin = new Date();

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, {
    user: user.getPublicProfile(),
    token,
    refreshToken,
  }, 'Role switched successfully');
});

const addRole = asyncHandler(async (req, res) => {
  const { role, ...roleFields } = req.body;

  if (!ADDABLE_ROLES.includes(role)) {
    throw new BadRequestError('This role cannot be self-added. Contact support for administrator access.');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.roles.includes(user.role) && SWITCHABLE_ROLES.includes(user.role)) {
    user.roles.push(user.role);
  }

  if (!user.roles.includes(role)) {
    user.roles.push(role);
  }

  Object.assign(user, roleFields);

  user.role = role;
  user.lastLogin = new Date();

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, {
    user: user.getPublicProfile(),
    token,
    refreshToken,
  }, 'Role added successfully');
});

// =====================================================
// VÉRIFICATION EMAIL — AVEC WHATSAPP PRIORITY
// =====================================================
const verifyEmail = asyncHandler(async (req, res) => {
  const { identifier, email, code } = req.body;
  const rawIdentifier = identifier || email;

  if (!rawIdentifier || !code) {
    throw new BadRequestError('Email/phone and verification code are required');
  }

  const identifierValue = String(rawIdentifier).trim();
  const isEmailIdentifier = identifierValue.includes('@');

  let user;

  if (isEmailIdentifier) {
    const verificationEmail = normalizeEmail(identifierValue);

    if (!validateEmail(verificationEmail)) {
      throw new BadRequestError('A valid email address is required');
    }

    user = await User.findOne({ email: verificationEmail });
  } else {
    const phoneVariants = normalizePhoneVariants(identifierValue);

    if (!phoneVariants.length || !validatePhone(identifierValue)) {
      throw new BadRequestError('A valid phone number is required');
    }

    const suffix = significantPhoneSuffix(identifierValue);
    const phoneClauses = phoneVariants.map((phone) => ({ phone }));
    if (suffix) phoneClauses.push({ phone: { $regex: suffix + '$' } });
    user = await User.findOne({ $or: phoneClauses });
  }

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const verificationType = isEmailIdentifier ? 'email' : 'phone';
  const alreadyVerified = isEmailIdentifier
    ? user.isEmailVerified
    : user.isPhoneVerified;

  if (alreadyVerified) {
    throw new BadRequestError(
      isEmailIdentifier
        ? 'Email already verified'
        : 'Phone number already verified'
    );
  }

  const verification = await Verification.findOne({
    user: user._id,
    type: verificationType,
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!verification) {
    throw new BadRequestError('Invalid or expired verification code');
  }

  if (verification.isExpired()) {
    throw new BadRequestError('Verification code expired');
  }

  if (verification.isBlocked()) {
    throw new BadRequestError('Too many verification attempts. Please request a new code.');
  }

  if (String(verification.code) !== String(code)) {
    verification.attempts += 1;
    await verification.save();

    if (verification.isBlocked()) {
      throw new BadRequestError('Too many verification attempts. Please request a new code.');
    }

    throw new BadRequestError('Invalid verification code');
  }

  verification.isUsed = true;
  await verification.save();

  if (isEmailIdentifier) {
    user.isEmailVerified = true;
  } else {
    user.isPhoneVerified = true;
  }

  user.isVerified = Boolean(user.isPhoneVerified || user.isEmailVerified);
  await user.save();

  // =========================================================
  // ✅ WHATSAPP PRIORITY — Envoi du code par SMS/WhatsApp
  // =========================================================
  if (!isEmailIdentifier) {
    try {
      await SMSService.sendVerification(user.phone, code, user.firstName);
      logger.info(`📱 Code de vérification renvoyé à ${user.phone} (WhatsApp prioritaire)`);
    } catch (error) {
      logger.error('Error resending verification SMS/WhatsApp:', error);
    }
  }

  if (isEmailIdentifier) {
    try {
      await EmailService.sendWelcome(
        user.email,
        user.firstName,
        user.role,
        user.preferredLanguage
      );
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  sendSuccess(
    res,
    {
      verified: true,
      verificationType,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isVerified: user.isVerified,
    },
    isEmailIdentifier
      ? 'Email verified successfully'
      : 'Phone number verified successfully'
  );
});

// =====================================================
// RENVOI DE CODE — AVEC WHATSAPP PRIORITY
// =====================================================
const resendVerification = asyncHandler(async (req, res) => {
  const { identifier, email } = req.body;
  const rawIdentifier = identifier || email;

  if (!rawIdentifier) {
    throw new BadRequestError('Email or phone number is required');
  }

  const identifierValue = String(rawIdentifier).trim();
  const isEmailIdentifier = identifierValue.includes('@');

  let user;
  let normalizedEmail;
  let normalizedPhone;

  if (isEmailIdentifier) {
    normalizedEmail = normalizeEmail(identifierValue);

    if (!validateEmail(normalizedEmail)) {
      throw new BadRequestError('A valid email address is required');
    }

    user = await User.findOne({ email: normalizedEmail });
  } else {
    const phoneVariants = normalizePhoneVariants(identifierValue);

    if (!phoneVariants.length || !validatePhone(identifierValue)) {
      throw new BadRequestError('A valid phone number is required');
    }

    const suffix = significantPhoneSuffix(identifierValue);
    const phoneClauses = phoneVariants.map((phone) => ({ phone }));
    if (suffix) phoneClauses.push({ phone: { $regex: suffix + '$' } });
    user = await User.findOne({ $or: phoneClauses });
    normalizedPhone = user?.phone || phoneVariants[0];
  }

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const verificationType = isEmailIdentifier ? 'email' : 'phone';
  const alreadyVerified = isEmailIdentifier
    ? user.isEmailVerified
    : user.isPhoneVerified;

  if (alreadyVerified) {
    throw new BadRequestError(
      isEmailIdentifier
        ? 'Email already verified'
        : 'Phone number already verified'
    );
  }

  const canalType = isEmailIdentifier ? 'email' : 'phone';
  const dejaValide = await Verification.findOne({
    user: user._id,
    type: canalType,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  let code;
  let expiresAt;

  if (dejaValide) {
    code = dejaValide.code;
    expiresAt = dejaValide.expiresAt;
  } else {
    await Verification.deleteMany({
      user: user._id,
      type: { $in: ['email', 'phone'] },
      isUsed: false,
    });

    code = generateVerificationCode();
    expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Verification.create([
      {
        user: user._id,
        code,
        type: 'email',
        expiresAt,
      },
      {
        user: user._id,
        code,
        type: 'phone',
        expiresAt,
      },
    ]);
  }

  try {
    if (isEmailIdentifier) {
      await EmailService.sendVerification(
        normalizedEmail,
        code,
        user.firstName,
        user.preferredLanguage
      );
    } else {
      // =========================================================
      // ✅ WHATSAPP PRIORITY — Envoi du code par SMS/WhatsApp
      // =========================================================
      await SMSService.sendVerification(
        normalizedPhone,
        code,
        user.firstName
      );
      logger.info(`📱 Code de vérification renvoyé à ${normalizedPhone} (WhatsApp prioritaire)`);
    }
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw new BadRequestError('Unable to send verification code. Please try again.');
  }

  sendSuccess(
    res,
    {
      channel: isEmailIdentifier ? 'email' : 'sms',
      expiresIn: Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
    },
    'Verification code sent'
  );
});

// =====================================================
// MOT DE PASSE OUBLIÉ — AVEC WHATSAPP PRIORITY
// =====================================================
const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    throw new BadRequestError('Email or phone number is required');
  }

  const identifierQuery = buildIdentifierQuery(String(identifier));
  if (!identifierQuery) throw new BadRequestError('A valid email address or phone number is required');
  const user = await User.findOne(identifierQuery);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  let verification = await Verification.findOne({
    user: user._id,
    type: 'password_reset',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  let code;
  if (verification) {
    code = verification.code;
  } else {
    await Verification.deleteMany({
      user: user._id,
      type: 'password_reset',
      isUsed: false,
    });

    code = generateVerificationCode();
    await Verification.create({
      user: user._id,
      code,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  }

  const isEmailIdentifier = identifier.includes('@');

  try {
    if (isEmailIdentifier) {
      await EmailService.sendPasswordReset(user.email, code, user.firstName, user.preferredLanguage);
    } else if (user.phone) {
      // =========================================================
      // ✅ WHATSAPP PRIORITY — Envoi du code par SMS/WhatsApp
      // =========================================================
      await SMSService.sendPasswordReset(user.phone, code, user.firstName);
      logger.info(`📱 Code de réinitialisation envoyé à ${user.phone} (WhatsApp prioritaire)`);
    } else {
      throw new Error('No phone number on this account');
    }
  } catch (error) {
    console.error('Error sending reset code:', error);
    throw new BadRequestError('Unable to send the reset code. Please check the number/email or try again.');
  }

  sendSuccess(res, null, 'Password reset code sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, code, newPassword } = req.body;

  if (!identifier || !code || !newPassword) {
    throw new BadRequestError('All fields are required');
  }

  if (!validatePassword(newPassword)) {
    throw new BadRequestError('Password must be at least 6 characters with uppercase, lowercase and number');
  }

  const identifierQuery = buildIdentifierQuery(String(identifier));
  if (!identifierQuery) throw new BadRequestError('A valid email address or phone number is required');
  const user = await User.findOne(identifierQuery);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const verification = await Verification.findOne({
    user: user._id,
    code,
    type: 'password_reset',
    isUsed: false,
  });

  if (!verification) {
    throw new BadRequestError('Invalid or expired reset code');
  }

  if (verification.isExpired()) {
    throw new BadRequestError('Reset code expired');
  }

  user.password = newPassword;
  user.passwordSetByUser = true;
  await user.save();

  verification.isUsed = true;
  await verification.save();

  sendSuccess(res, null, 'Password reset successfully');
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new BadRequestError('Refresh token is required');
  }

  const user = await User.findOne({ refreshToken: token });
  if (!user) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const newToken = generateToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  sendSuccess(res, {
    token: newToken,
    refreshToken: newRefreshToken,
  }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  sendSuccess(res, null, 'Logged out successfully');
});

// =====================================================
// FIREBASE AUTH — AVEC EMAIL DE BIENVENUE
// =====================================================
const firebaseAuth = asyncHandler(async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken) {
    throw new BadRequestError('Firebase idToken is required');
  }

  const allowedRoles = ['client', 'seller', 'livreur', 'affiliate'];
  const requestedRole = allowedRoles.includes(role) ? role : 'client';

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired Firebase token');
  }

  const { uid, email, name, picture } = decoded;
  if (!email) {
    throw new BadRequestError('No email associated with this Google/Facebook account');
  }

  let user = await User.findOne({ firebaseUid: uid });

  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      user.firebaseUid = uid;
      if (!user.profilePicture && picture) user.profilePicture = picture;
      await user.save();
    } else {
      // Extraction améliorée du nom complet
      let firstName = 'Utilisateur';
      let lastName = '';
      if (name) {
        const parts = name.trim().split(' ');
        firstName = parts[0] || 'Utilisateur';
        lastName = parts.slice(1).join(' ') || '';
      }

      // Si le nom n'est pas fourni par Google/Facebook, on utilise l'email
      if (!name || name === 'Utilisateur' || firstName === 'Utilisateur') {
        const emailParts = email.split('@')[0];
        if (emailParts) {
          const nameParts = emailParts.split(/[._-]/);
          firstName = nameParts[0] || 'Utilisateur';
          lastName = nameParts.slice(1).join(' ') || '';
        }
      }

      // Si le nom est toujours vide, fallback ultime
      if (!firstName || firstName === 'Utilisateur') {
        firstName = 'Client';
      }
      if (!lastName) {
        lastName = '';
      }

      user = await User.create({
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        password: crypto.randomBytes(32).toString('hex'),
        passwordSetByUser: false,
        role: requestedRole,
        isVerified: true,
        profilePicture: picture || undefined,
        firebaseUid: uid,
      });

      // =========================================================
      // ✅ Envoyer un email de bienvenue pour le compte créé via social
      // =========================================================
      try {
        await EmailService.sendWelcome(
          user.email,
          user.firstName,
          user.role,
          user.preferredLanguage
        );
      } catch (error) {
        logger.error('Error sending welcome email for social login:', error);
      }
    }
  }

  if (user.status === 'suspended') {
    throw new UnauthorizedError('Account suspended');
  }

  if (user.accountStatus === 'hidden') {
    await handleHiddenAccountLogin(user);
  } else if (user.accountStatus && user.accountStatus !== 'active') {
    const accountStatusMessages = {
      closed: 'Votre compte a été fermé à votre demande.',
      pending_deletion: 'Votre compte est en cours de suppression suite à votre demande.',
    };
    throw new UnauthorizedError(accountStatusMessages[user.accountStatus] || 'Ce compte n\'est plus accessible.');
  }

  user.lastLogin = new Date();
  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
    },
    token,
    refreshToken,
  }, 'Firebase authentication successful');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -refreshToken');

  sendSuccess(res, user, 'User profile retrieved');
});

module.exports = {
  register,
  login,
  firebaseAuth,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
  verifySecurityCode,
  verifySecurityOtp,
  setSecurityCode,
  forgotSecurityCode,
  resetSecurityCode,
  switchRole,
  addRole,
  buildIdentifierQuery,
};
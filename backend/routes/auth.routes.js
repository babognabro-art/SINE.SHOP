const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');
const { authLimiter, sensitiveLimiter } = require('../middlewares/rateLimit.middleware');
const { protect } = require('../middlewares/auth.middleware');
const {
  register, login, firebaseAuth, verifyEmail, resendVerification,
  forgotPassword, resetPassword, refreshToken, logout, getMe,
  verifySecurityCode, verifySecurityOtp, setSecurityCode, forgotSecurityCode, resetSecurityCode, switchRole, addRole,
} = require('../controllers/auth.controller');

const emailOrPhone = body('identifier').custom((value) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Email or phone number is required');
  const v = value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const phoneDigits = v.replace(/[^0-9]/g, '');
  const phoneOk = phoneDigits.length >= 7 && phoneDigits.length <= 15;
  if (!emailOk && !phoneOk) throw new Error('Enter a valid email address or phone number');
  return true;
});

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  // Le contrôleur vérifie lui-même les rôles privilégiés avec ADMIN_REGISTRATION_CODE.
  body('role').optional().isString().withMessage('Invalid role'),
];

// Connexion : le frontend envoie désormais { identifier, password }.
// `email` reste accepté par le contrôleur pour compatibilité avec les anciennes pages.
const loginValidation = [
  emailOrPhone,
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyValidation = [
  body('identifier').custom((value, { req }) => {
    const candidate = typeof value === 'string' && value.trim()
      ? value.trim()
      : (typeof req.body.email === 'string' ? req.body.email.trim() : '');

    if (!candidate) {
      throw new Error('Email or phone number is required');
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate);
    const phoneDigits = candidate.replace(/[^0-9]/g, '');
    const phoneOk = phoneDigits.length >= 7 && phoneDigits.length <= 15;

    if (!emailOk && !phoneOk) {
      throw new Error('Enter a valid email address or phone number');
    }

    return true;
  }),
  body('code').matches(/^\d{6}$/).withMessage('Verification code must be 6 digits'),
];

const forgotValidation = [
  body('identifier').optional().notEmpty().withMessage('Email is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

const identifierValidation = [emailOrPhone];

const resetValidation = [
  emailOrPhone,
  body('code').matches(/^\d{6}$/).withMessage('Reset code must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const securityCodeValidation = [
  emailOrPhone,
  body('code').matches(/^\d{4,8}$/).withMessage('Security code must be 4 to 8 digits'),
];

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/firebase', authLimiter, body('idToken').notEmpty().withMessage('idToken is required'), validate, firebaseAuth);
router.post('/verify', verifyValidation, validate, verifyEmail);
// sensitiveLimiter (3/5min) en plus de authLimiter : ces deux routes
// envoient un code par SMS/email à un tiers (numéro/adresse saisi par le
// requérant, pas forcément le sien) — sans limite dédiée plus stricte,
// elles permettent de spammer/harceler n'importe quel compte avec des
// codes à répétition. sensitiveLimiter et adminLimiter existaient déjà
// dans rateLimit.middleware.js mais n'étaient utilisés NULLE PART dans
// les routes — code mort qui ne protégeait rien.
router.post('/resend-verification', authLimiter, sensitiveLimiter, forgotValidation, validate, resendVerification);
router.post('/forgot-password', authLimiter, sensitiveLimiter, identifierValidation, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetValidation, validate, resetPassword);
router.post('/verify-security-code', authLimiter, securityCodeValidation, validate, verifySecurityCode);
router.post('/verify-security-otp', authLimiter, verifySecurityOtp);
router.post('/set-security-code', protect, setSecurityCode);
router.post('/forgot-security-code', sensitiveLimiter, forgotSecurityCode);
router.post('/reset-security-code', sensitiveLimiter, resetSecurityCode);
router.post('/switch-role', protect, body('role').notEmpty().withMessage('Role is required'), validate, switchRole);
router.post('/add-role', protect, body('role').notEmpty().withMessage('Role is required'), validate, addRole);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;

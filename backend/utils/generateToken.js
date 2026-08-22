const crypto = require('crypto');
// Délègue à config/jwt.js — source unique de vérité pour le secret JWT.
// Ce fichier avait sa propre copie de jwt.sign() avec une valeur de repli
// DIFFÉRENTE de celle de config/jwt.js ('sine_shop_default_secret' au lieu
// de 'sine_shop_default_secret_2024') : si JWT_SECRET n'était pas défini,
// selon le chemin de code emprunté, un jeton signé içi n'aurait pas pu être
// vérifié par verifyToken() ailleurs — et inversement, un vrai risque de
// sécurité (deux secrets de repli différents, tous deux visibles dans le
// code source).
const { generateToken: signToken, generateRefreshToken: signRefreshToken } = require('../config/jwt');

const generateToken = (userId, role) => signToken(userId, role);

const generateRefreshToken = (userId) => signRefreshToken(userId);

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateAffiliateCode = () => {
  return 'SINE' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateUUID = () => {
  return crypto.randomUUID();
};

const generateOTP = (length = 6) => {
  const chars = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateVerificationCode,
  generateAffiliateCode,
  generateRandomPassword,
  generateUUID,
  generateOTP,
};
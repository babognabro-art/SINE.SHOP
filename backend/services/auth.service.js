// NB: ce service n'est actuellement importé par aucune route (auth.controller.js
// gère login/register directement) — mais il contenait deux versions dupliquées
// et cassées (transporter importé comme fonction alors que config/mail exporte
// un objet, user.isActive/generateAuthToken inexistants sur le modèle User).
// Nettoyé et corrigé pour rester utilisable si un jour on le branche.
const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { sendMail } = require('../config/mail');

const generateAuthToken = (user) => {
  return generateToken(user._id, user.role);
};

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await sendMail(
    email,
    'Vérification de votre compte SINE.SHOP',
    `<p>Cliquez sur ce lien pour vérifier votre email : <a href="${verificationUrl}">${verificationUrl}</a></p>`
  );
};

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new Error('Utilisateur non trouvé.');
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Mot de passe incorrect.');
  if (user.status === 'suspended') throw new Error('Compte désactivé.');
  const token = generateAuthToken(user);
  return { user, token };
};

const register = async (userData) => {
  const user = new User(userData);
  await user.save();
  return user;
};

const verifyResetToken = async (token) => {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error('Token invalide ou expiré.');
  return user;
};

module.exports = { generateAuthToken, sendVerificationEmail, login, register, verifyResetToken };

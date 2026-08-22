const fs = require('fs');
const { cloudinary } = require('../config/cloudinary');
const KycVerification = require('../models/KycVerification');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/ApiError');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');

const DOCUMENT_TYPES = ['national_id', 'passport', 'driver_license'];
// Un passeport n'a qu'une page d'identité — recto/verso n'est exigé que
// pour la CNI et le permis de conduire.
const TYPES_REQUIRING_BACK = ['national_id', 'driver_license'];

async function uploadToCloudinary(file, folder) {
  try {
    const result = await cloudinary.uploader.upload(file.path, { folder });
    return result.secure_url;
  } finally {
    fs.unlink(file.path, () => {});
  }
}

// POST /api/kyc — soumet (ou resoumet après un rejet) une vérification
// d'identité. Un utilisateur ne peut pas resoumettre tant que la précédente
// est "pending" ou déjà "approved".
const submitKyc = asyncHandler(async (req, res) => {
  const { documentType } = req.body;

  if (!DOCUMENT_TYPES.includes(documentType)) {
    throw new BadRequestError('Type de document invalide.');
  }

  const existing = await KycVerification.findOne({ user: req.user.id });
  if (existing && existing.status === 'pending') {
    throw new BadRequestError('Votre vérification est déjà en cours d\'examen.');
  }
  if (existing && existing.status === 'approved') {
    throw new BadRequestError('Votre identité est déjà vérifiée.');
  }

  const files = req.files || {};
  if (!files.documentFront || !files.documentFront[0]) {
    throw new BadRequestError('Le recto du document est obligatoire.');
  }
  if (!files.selfie || !files.selfie[0]) {
    throw new BadRequestError('Le selfie est obligatoire.');
  }
  if (TYPES_REQUIRING_BACK.includes(documentType) && (!files.documentBack || !files.documentBack[0])) {
    throw new BadRequestError('Le verso du document est obligatoire pour ce type de pièce.');
  }

  const [documentFrontUrl, documentBackUrl, selfieUrl] = await Promise.all([
    uploadToCloudinary(files.documentFront[0], 'kyc/documents'),
    files.documentBack && files.documentBack[0] ? uploadToCloudinary(files.documentBack[0], 'kyc/documents') : Promise.resolve(undefined),
    uploadToCloudinary(files.selfie[0], 'kyc/selfies'),
  ]);

  const kyc = await KycVerification.findOneAndUpdate(
    { user: req.user.id },
    {
      user: req.user.id,
      documentType,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const user = await User.findById(req.user.id);
  try {
    await EmailService.sendKycSubmissionAlert(kyc, user);
  } catch (error) {
    logger.error('Error sending KYC submission alert:', error);
  }

  sendCreated(res, kyc, 'Verification submitted successfully');
});

// GET /api/kyc/me — statut de la vérification du compte connecté.
const getMyKyc = asyncHandler(async (req, res) => {
  const kyc = await KycVerification.findOne({ user: req.user.id });
  sendSuccess(res, kyc, 'KYC status retrieved');
});

// GET /api/kyc — réservé aux admins, file d'attente des vérifications.
const getAllKyc = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const list = await KycVerification.find(filter)
    .populate('user', 'firstName lastName email phone role')
    .sort({ createdAt: -1 });
  sendSuccess(res, list, 'KYC list retrieved');
});

// PUT /api/kyc/:id/review — réservé aux admins, approuve ou rejette.
const reviewKyc = asyncHandler(async (req, res) => {
  const { decision, note } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    throw new BadRequestError('Decision must be "approved" or "rejected".');
  }

  const kyc = await KycVerification.findById(req.params.id);
  if (!kyc) {
    throw new NotFoundError('KYC request not found');
  }

  kyc.status = decision;
  kyc.reviewedBy = req.user.id;
  kyc.reviewedAt = new Date();
  kyc.reviewNote = note || '';
  await kyc.save();

  const user = await User.findById(kyc.user);

  if (decision === 'approved') {
    // Réutilise le badge "boutique vérifiée" déjà affiché côté vendeur.html
    // — cohérent quel que soit le rôle du compte vérifié.
    if (user) await User.findByIdAndUpdate(kyc.user, { isStoreVerified: true });
  }

  // Notifier la personne elle-même de la décision — jusqu'ici, seule
  // l'équipe interne était prévenue de la soumission, jamais le résultat.
  if (user?.email) {
    try {
      if (decision === 'approved') {
        await EmailService.sendKycApproved(user.email, user.firstName, user.role, user.preferredLanguage);
      } else {
        await EmailService.sendKycRejected(user.email, user.firstName, note, user.role, user.preferredLanguage);
      }
    } catch (error) {
      logger.error('Error sending KYC decision email:', error);
    }
  }

  sendSuccess(res, kyc, 'KYC reviewed successfully');
});

module.exports = {
  submitKyc,
  getMyKyc,
  getAllKyc,
  reviewKyc,
};

const mongoose = require('mongoose');

// Vérification d'identité (KYC) — carte nationale d'identité, passeport ou
// permis de conduire, plus un selfie. Un enregistrement par utilisateur ;
// une nouvelle soumission remplace la précédente si elle a été rejetée.
const kycVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  documentType: {
    type: String,
    enum: ['national_id', 'passport', 'driver_license'],
    required: true,
  },
  documentFrontUrl: { type: String, required: true },
  // Non requis pour un passeport (une seule page d'identité), requis pour
  // CNI et permis de conduire (recto/verso) — vérifié dans le contrôleur.
  documentBackUrl: { type: String },
  selfieUrl: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
}, {
  timestamps: true,
});

module.exports = mongoose.model('KycVerification', kycVerificationSchema);

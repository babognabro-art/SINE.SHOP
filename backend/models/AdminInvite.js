const mongoose = require('mongoose');

// Invitation nominative à créer un compte à privilèges — remplace le code
// fixe partagé (ADMIN_REGISTRATION_CODE) que N'IMPORTE QUI connaissant sa
// valeur pouvait utiliser pour créer N'IMPORTE LEQUEL des 4 rôles à
// privilèges. Ici, chaque lien est : à usage UNIQUE, lié à un rôle précis
// choisi par le Boss/un admin déjà en poste au moment de la génération,
// et normalement réservé à l'email de la personne visée.
const adminInviteSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin', 'moderator', 'support', 'finance_admin'],
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  // Lien optionnel vers la candidature d'origine (seler-page.html) — permet
  // de retrouver le contexte complet (CV, motivation...) depuis l'invitation.
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminApplication',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: Date,
  createdAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 jours
  },
}, { timestamps: true });

adminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // purge 30j après expiration

module.exports = mongoose.model('AdminInvite', adminInviteSchema);

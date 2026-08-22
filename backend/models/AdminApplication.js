const mongoose = require('mongoose');

// Candidature "Demande d'accès Administrateur" soumise depuis
// frontend/html/seler-page.html. Accessible sans compte connecté (le
// candidat n'a pas forcément de compte SINE.SHOP au moment de postuler).
const adminApplicationSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  birthdate: { type: String },
  gender: { type: String, enum: ['homme', 'femme', 'autre'] },
  marital: { type: String, enum: ['celibataire', 'marie', 'divorce', 'veuf', 'pacse'] },
  children: { type: String, default: '0' },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  education: { type: String, required: true },
  experience: { type: String, required: true },
  skills: { type: String },
  motivation: { type: String, required: true },

  // Documents — URLs Cloudinary (CV et pièce d'identité obligatoires,
  // le reste optionnel, aligné sur le formulaire).
  cvUrl: { type: String, required: true },
  letterUrl: { type: String },
  idUrl: { type: String, required: true },
  proofUrl: { type: String },

  // Type d'accès administrateur demandé — permet au Boss de générer
  // directement une invitation pour LE BON rôle sans avoir à le
  // redemander au candidat (voir seler-page.html, sélecteur ajouté avant
  // le formulaire de candidature).
  requestedRole: {
    type: String,
    enum: ['admin', 'superadmin', 'finance_admin', 'moderator', 'support'],
    default: 'admin',
  },

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

module.exports = mongoose.model('AdminApplication', adminApplicationSchema);

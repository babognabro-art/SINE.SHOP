const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// =====================================================
// COMPTE DU "CENTRE OFFICIEL" (sineshopofficiel.html)
// =====================================================
// Volontairement SÉPARÉ du modèle User classique — cette page n'est
// accessible par AUCUNE page register/login publique, elle a son propre
// système d'authentification fermé, limité à 6 comptes maximum (imposé
// aussi côté serveur, pas seulement côté affichage).
const officialUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 32,
  },
  // Jamais renvoyé par défaut dans les requêtes (select:false, comme
  // User.password) — sélectionné explicitement seulement à la connexion.
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['owner', 'admin'],
    default: 'admin',
  },
}, { timestamps: true });

officialUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

officialUserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('OfficialUser', officialUserSchema);

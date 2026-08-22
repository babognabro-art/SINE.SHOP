const mongoose = require('mongoose');

// Document unique (singleton) — réglages globaux définis par le Boss
// (sineshopofficiel) depuis administrateur.html. Pour l'instant : la
// vidéo de bienvenue/promo affichée une seule fois à chaque nouveau
// compte (client/vendeur/livreur/affiliation) lors de sa toute première
// connexion, fermable via une croix.
const appSettingsSchema = new mongoose.Schema({
  singleton: {
    type: String,
    default: 'app-settings',
    unique: true,
  },
  welcomeVideoUrl: {
    type: String,
    default: '',
  },
  welcomeVideoEnabled: {
    type: Boolean,
    default: false,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

appSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ singleton: 'app-settings' });
  if (!settings) {
    settings = await this.create({ singleton: 'app-settings' });
  }
  return settings;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);

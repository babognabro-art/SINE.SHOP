const AppSettings = require('../models/AppSettings');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');

// Lecture publique (n'importe quel compte connecté peut vérifier s'il doit
// voir la vidéo de bienvenue) — aucune donnée sensible exposée.
const getSettings = asyncHandler(async (req, res) => {
  const settings = await AppSettings.getSettings();
  sendSuccess(res, {
    welcomeVideoUrl: settings.welcomeVideoUrl,
    welcomeVideoEnabled: settings.welcomeVideoEnabled,
  });
});

// Réservé au Boss (superadmin) — définit/active la vidéo de bienvenue
// diffusée une seule fois à chaque nouveau compte.
const updateSettings = asyncHandler(async (req, res) => {
  const { welcomeVideoUrl, welcomeVideoEnabled } = req.body;
  const settings = await AppSettings.getSettings();
  if (welcomeVideoUrl !== undefined) settings.welcomeVideoUrl = welcomeVideoUrl;
  if (welcomeVideoEnabled !== undefined) settings.welcomeVideoEnabled = welcomeVideoEnabled;
  settings.updatedBy = req.user.id;
  await settings.save();
  sendSuccess(res, settings, 'Réglages mis à jour avec succès');
});

module.exports = { getSettings, updateSettings };

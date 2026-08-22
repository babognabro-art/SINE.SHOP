const logger = require('../utils/logger');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    // 'resource_type' n'était jamais précisé — Cloudinary utilise alors
    // 'image' par défaut, qui échoue pour toute vidéo envoyée (ex: pièce
    // jointe vidéo en messagerie, "Erreur de upload" côté utilisateur) et
    // se comporte de façon imprévisible pour les fichiers non-image (PDF,
    // docs). 'auto' laisse Cloudinary détecter le vrai type à partir du
    // contenu réel du fichier, quel que soit le type MIME envoyé.
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: req.body.folder || 'general',
      resource_type: 'auto',
      transformation: req.body.transformation ? JSON.parse(req.body.transformation) : undefined,
    });

    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'upload.' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { public_id } = req.body;
    const result = await cloudinary.uploader.destroy(public_id);
    if (result.result === 'ok') {
      res.json({ message: 'Fichier supprimé.' });
    } else {
      res.status(400).json({ message: 'Échec de la suppression.' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Upload multiple
exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const uploadPromises = req.files.map(file =>
      cloudinary.uploader.upload(file.path, { folder: req.body.folder || 'general', resource_type: 'auto' })
    );
    const results = await Promise.all(uploadPromises);

    // Nettoyer les fichiers temporaires
    req.files.forEach(file => fs.unlinkSync(file.path));

    const urls = results.map(r => r.secure_url);
    res.json({ urls });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'upload multiple.' });
  }
};
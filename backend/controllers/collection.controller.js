const logger = require('../utils/logger');
const Collection = require('../models/Collection');

exports.createCollection = async (req, res) => {
  try {
    const collection = new Collection(req.body);
    await collection.save();
    res.status(201).json({ message: 'Collection créée.', collection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.getCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ isActive: true }).populate('products');
    res.json(collections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id).populate('products');
    if (!collection) {
      return res.status(404).json({ message: 'Collection non trouvée.' });
    }
    res.json(collection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!collection) {
      return res.status(404).json({ message: 'Collection non trouvée.' });
    }
    res.json({ message: 'Collection mise à jour.', collection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection non trouvée.' });
    }
    res.json({ message: 'Collection supprimée.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
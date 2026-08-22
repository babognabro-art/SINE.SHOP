const logger = require('../utils/logger');
const User = require('../models/User');
const Client = require('../models/Client');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

// Trouve le document Client du user connecté, ou le crée s'il n'existe pas
// encore (aucun autre code ne le créait jusqu'ici, ce qui faisait échouer
// systématiquement toutes les routes /api/clients/* avec un 404).
async function findOrCreateClient(userId) {
  let client = await Client.findOne({ user: userId });
  if (!client) {
    client = await Client.create({ user: userId });
  }
  return client;
}

// Obtenir le profil du client connecté
exports.getProfile = async (req, res) => {
  try {
    await findOrCreateClient(req.user._id);
    const client = await Client.findOne({ user: req.user._id })
      .populate('user')
      .populate('addresses')
      .populate('cart')
      .populate('favorites')
      .populate('orderHistory');
    res.json(client);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Mettre à jour le profil client
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, birthDate } = req.body;
    const client = await findOrCreateClient(req.user._id);

    // Mettre à jour les champs de l'utilisateur
    const user = await User.findById(req.user._id);
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    await user.save();

    // Mettre à jour les champs spécifiques client
    if (birthDate) client.birthDate = birthDate;
    await client.save();

    res.json({ message: 'Profil mis à jour.', client });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Ajouter une adresse
exports.addAddress = async (req, res) => {
  try {
    const addressData = { ...req.body, user: req.user._id };
    const address = new Address(addressData);
    await address.save();

    const client = await findOrCreateClient(req.user._id);
    client.addresses.push(address._id);
    await client.save();

    res.status(201).json({ message: 'Adresse ajoutée.', address });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Mettre à jour une adresse
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Adresse non trouvée.' });
    }
    Object.assign(address, req.body);
    await address.save();
    res.json({ message: 'Adresse mise à jour.', address });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer une adresse
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Adresse non trouvée.' });
    }
    // Retirer de la liste du client
    await Client.updateOne({ user: req.user._id }, { $pull: { addresses: id } });
    res.json({ message: 'Adresse supprimée.' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Obtenir l'historique des commandes
exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
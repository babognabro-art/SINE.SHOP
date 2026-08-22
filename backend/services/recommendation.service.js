// NB: ce service n'est actuellement importé par aucune route — contenait
// deux versions dupliquées (double déclaration de Product/Order, qui
// provoquait une SyntaxError) et utilisait Product.isActive, un champ qui
// n'existe pas (le vrai champ est isAvailable). Nettoyé et corrigé.
const Order = require('../models/Order');
const Product = require('../models/Product');

const getRecommendedProducts = async (limit = 10) => {
  // Produits les plus populaires (le plus commandés)
  const popularProducts = await Order.aggregate([
    { $unwind: '$items' },
    { $group: { _id: '$items.product', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $replaceRoot: { newRoot: '$product' } },
  ]);
  return popularProducts;
};

const getRecommendationsForClient = async (clientId, limit = 10) => {
  // Approche simple : produits les plus vus, disponibles
  return Product.find({ isAvailable: true }).sort({ views: -1 }).limit(limit);
};

const getSimilarProducts = async (productId, limit = 10) => {
  const product = await Product.findById(productId);
  if (!product) return [];
  return Product.find({ category: product.category, _id: { $ne: productId }, isAvailable: true })
    .limit(limit);
};

module.exports = { getRecommendedProducts, getRecommendationsForClient, getSimilarProducts };

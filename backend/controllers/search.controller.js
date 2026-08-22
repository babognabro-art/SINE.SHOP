const logger = require('../utils/logger');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');

exports.search = async (req, res) => {
  try {
    const { q, type = 'products', limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Terme de recherche requis.' });
    }

    let results = [];
    if (type === 'products') {
      results = await Product.find(
        { $text: { $search: q }, isAvailable: true },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .populate('category')
      .populate('seller');
    } else if (type === 'sellers') {
      results = await User.find(
        { $text: { $search: q }, role: 'seller', status: 'active' },
        { score: { $meta: 'textScore' } }
      )
      .select('-password -refreshToken')
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit));
    } else if (type === 'categories') {
      results = await Category.find(
        { $text: { $search: q } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit));
    } else {
      return res.status(400).json({ message: 'Type de recherche invalide.' });
    }

    res.json({ results });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Suggestions automatiques (autocomplete)
exports.suggest = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const products = await Product.find(
      { name: { $regex: q, $options: 'i' }, isAvailable: true },
      { name: 1 }
    ).limit(5);

    const categories = await Category.find(
      { name: { $regex: q, $options: 'i' } },
      { name: 1 }
    ).limit(5);

    const suggestions = [
      ...products.map(p => ({ type: 'product', label: p.name, id: p._id })),
      ...categories.map(c => ({ type: 'category', label: c.name, id: c._id })),
    ];

    res.json(suggestions);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
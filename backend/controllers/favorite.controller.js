// controllers/favorite.controller.js
const Favorite = require('../models/Favorite');
const Product = require('../models/Product');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Ajouter aux favoris
// @route   POST /api/favorites
// @access  Private
const addFavorite = async (req, res, next) => {
  try {
    const { productId } = req.body;

    // Vérifier si le produit existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json(ApiResponse.error('Produit non trouvé', 404));
    }

    // Vérifier si déjà en favori
    const existing = await Favorite.findOne({
      user: req.user.id,
      product: productId,
    });

    if (existing) {
      return res.status(400).json(ApiResponse.error('Produit déjà en favori', 400));
    }

    const favorite = await Favorite.create({
      user: req.user.id,
      product: productId,
    });

    res.status(201).json(
      ApiResponse.success(favorite, 'Ajouté aux favoris avec succès')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer des favoris
// @route   DELETE /api/favorites/:productId
// @access  Private
const removeFavorite = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const result = await Favorite.findOneAndDelete({
      user: req.user.id,
      product: productId,
    });

    if (!result) {
      return res.status(404).json(ApiResponse.error('Favori non trouvé', 404));
    }

    res.status(200).json(
      ApiResponse.success(null, 'Retiré des favoris avec succès')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les favoris de l'utilisateur
// @route   GET /api/favorites
// @access  Private
const getFavorites = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const favorites = await Favorite.find({ user: req.user.id })
      .populate({
        path: 'product',
        populate: {
          path: 'seller',
          select: 'fullName storeName',
        },
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Favorite.countDocuments({ user: req.user.id });

    res.status(200).json(
      ApiResponse.success({
        favorites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Vérifier si un produit est en favori
// @route   GET /api/favorites/check/:productId
// @access  Private
const checkFavorite = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const favorite = await Favorite.findOne({
      user: req.user.id,
      product: productId,
    });

    res.status(200).json(
      ApiResponse.success({
        isFavorite: !!favorite,
        favoriteId: favorite ? favorite._id : null,
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Nombre de favoris par produit — pour le vendeur, afin qu'il
//          sache lesquels de ses articles sont mis en favoris par les
//          clients (demande explicite : traçabilité complète achat/favoris/
//          commande/réservation depuis l'espace vendeur). Volontairement
//          des COMPTEURS agrégés, pas la liste des clients qui ont favorisé
//          — cohérent avec le système de confidentialité du profil déjà
//          construit (un client contrôle qui voit ses informations).
// @route   GET /api/favorites/seller-stats
// @access  Private (seller)
const getSellerFavoriteStats = async (req, res, next) => {
  try {
    const Product = require('../models/Product');
    const myProducts = await Product.find({ seller: req.user.id }).select('_id name images');

    const stats = await Favorite.aggregate([
      { $match: { product: { $in: myProducts.map((p) => p._id) } } },
      { $group: { _id: '$product', count: { $sum: 1 } } },
    ]);

    const countByProduct = new Map(stats.map((s) => [String(s._id), s.count]));

    const result = myProducts
      .map((p) => ({
        productId: p._id,
        productName: p.name,
        image: p.images?.[0] || '',
        favoriteCount: countByProduct.get(String(p._id)) || 0,
      }))
      .filter((p) => p.favoriteCount > 0)
      .sort((a, b) => b.favoriteCount - a.favoriteCount);

    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite,
  getSellerFavoriteStats,
};
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const CloudinaryService = require('../services/cloudinary.service');
const CurrencyService = require('../services/currency.service');

const getSellerProfile = asyncHandler(async (req, res) => {
  const targetId = req.params.id || req.user.id;
  const viewingOwnProfile = targetId === req.user.id;

  if (viewingOwnProfile) {
    // Le vendeur consulte/gère son propre compte — toutes les infos utiles
    // à la gestion de sa boutique, comme avant.
    const seller = await User.findById(targetId).select('-password -refreshToken');
    if (!seller) {
      throw new NotFoundError('Seller not found');
    }
    return sendSuccess(res, seller, 'Seller profile retrieved successfully');
  }

  // Profil consulté par quelqu'un d'autre (mini-profil vendeur public
  // cliqué depuis une fiche produit) — jamais l'email, le téléphone,
  // l'adresse exacte, la position GPS ou toute autre donnée privée.
  // Auparavant, cette route renvoyait le document utilisateur complet
  // (hors mot de passe) à n'importe quel compte connecté, quel que soit
  // le vendeur consulté — une vraie fuite de données personnelles.
  const seller = await User.findById(targetId)
    .select('firstName lastName storeName storeDescription profilePicture bio isStoreVerified address.city address.country createdAt role storeLogo storeBanner pseudo socialLinks');

  if (!seller) {
    throw new NotFoundError('Seller not found');
  }

  if (seller.role !== 'seller' && seller.role !== 'admin') {
    throw new BadRequestError('User is not a seller');
  }

  const [productCount, ratingAgg] = await Promise.all([
    Product.countDocuments({ seller: targetId, isAvailable: true }),
    Product.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(targetId), numReviews: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: '$numReviews' } } },
    ]),
  ]);

  sendSuccess(res, {
    _id: seller._id,
    firstName: seller.firstName,
    lastName: seller.lastName,
    storeName: seller.storeName,
    storeDescription: seller.storeDescription,
    profilePicture: seller.profilePicture,
    storeLogo: seller.storeLogo,
    storeBanner: seller.storeBanner,
    pseudo: seller.pseudo,
    socialLinks: seller.socialLinks,
    bio: seller.bio,
    isStoreVerified: seller.isStoreVerified,
    city: seller.address?.city,
    country: seller.address?.country,
    memberSince: seller.createdAt,
    productCount,
    rating: ratingAgg[0]?.avgRating || 0,
    numReviews: ratingAgg[0]?.totalReviews || 0,
  }, 'Public seller profile retrieved successfully');
});

const updateSellerProfile = asyncHandler(async (req, res) => {
  const seller = await User.findById(req.user.id);
  if (!seller) {
    throw new NotFoundError('Seller not found');
  }

  const { storeName, storeDescription, storeAddress, ...rest } = req.body;

  // Upload du logo
  if (req.files && req.files.storeLogo) {
    if (seller.storeLogo) {
      await CloudinaryService.delete(seller.storeLogo.publicId);
    }
    const result = await CloudinaryService.upload(req.files.storeLogo[0].path, {
      folder: 'sineshop/sellers/logos',
      transformation: [{ width: 200, height: 200, crop: 'fill' }]
    });
    seller.storeLogo = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  // Upload de la bannière
  if (req.files && req.files.storeBanner) {
    if (seller.storeBanner) {
      await CloudinaryService.delete(seller.storeBanner.publicId);
    }
    const result = await CloudinaryService.upload(req.files.storeBanner[0].path, {
      folder: 'sineshop/sellers/banners',
      transformation: [{ width: 1200, height: 400, crop: 'fill' }]
    });
    seller.storeBanner = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  seller.storeName = storeName || seller.storeName;
  seller.storeDescription = storeDescription || seller.storeDescription;
  seller.storeAddress = storeAddress || seller.storeAddress;
  Object.assign(seller, rest);

  await seller.save();

  sendSuccess(res, seller, 'Seller profile updated successfully');
});

const getSellerStats = asyncHandler(async (req, res) => {
  const sellerId = req.params.id || req.user.id;

  const totalProducts = await Product.countDocuments({ seller: sellerId });
  const totalOrders = await Order.countDocuments({ seller: sellerId });
  const totalSales = await Order.aggregate([
    { $match: { seller: new mongoose.Types.ObjectId(sellerId), status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);

  const ordersByStatus = await Order.aggregate([
    { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const stats = {
    totalProducts,
    totalOrders,
    totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
    ordersByStatus,
  };

  sendSuccess(res, stats, 'Seller statistics retrieved successfully');
});

const getSellerOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const sellerId = req.params.id || req.user.id;

  const query = { seller: sellerId };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('user', 'firstName lastName email phone')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  sendSuccess(res, {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Seller orders retrieved successfully');
});

const verifySeller = asyncHandler(async (req, res) => {
  const seller = await User.findById(req.params.id);
  if (!seller) {
    throw new NotFoundError('Seller not found');
  }

  if (seller.role !== 'seller') {
    throw new BadRequestError('User is not a seller');
  }

  seller.isStoreVerified = true;
  seller.isVerified = true;
  await seller.save();

  sendSuccess(res, seller, 'Seller verified successfully');
});

module.exports = {
  getSellerProfile,
  updateSellerProfile,
  getSellerStats,
  getSellerOrders,
  verifySeller,
};
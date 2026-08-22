const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const { nextSequence } = require('../models/Counter');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/ApiError');
const CloudinaryService = require('../services/cloudinary.service');
const EmailService = require('../services/email.service');
const logger = require('../utils/logger');

// Un vendeur ne doit jamais pouvoir modifier ou supprimer un produit qui
// a une réservation active ou une commande en cours — ça changerait/
// ferait disparaître ce que l'acheteur a réellement réservé/commandé/payé.
// Ni updateProduct ni deleteProduct n'avaient jusqu'ici la moindre
// vérification de ce genre.
async function hasActiveCommitment(productId) {
  const activeReservation = await Reservation.exists({
    product: productId,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (activeReservation) return 'reservation';

  const activeOrder = await Order.exists({
    'items.product': productId,
    status: { $nin: ['delivered', 'cancelled', 'refunded'] },
  });
  if (activeOrder) return 'order';

  return null;
}

const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, category, stock, weight, dimensions, ...rest } = req.body;

    // ✅ RÉSOUD LA CATÉGORIE
    const categoryId = await resolveCategoryId(category);
    if (!categoryId) {
        throw new NotFoundError('Category not found');
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
        throw new NotFoundError('Category not found');
    }



  // Upload des images
  let images = [];
  if (req.files && req.files.images) {
    const files = req.files.images.map(file => file.path);
    const results = await CloudinaryService.uploadProductImages(files);
    images = results.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));
  }

  // Upload des vidéos
  let videos = [];
  if (req.files && req.files.videos) {
    const files = req.files.videos.map(file => file.path);
    const results = await CloudinaryService.uploadMultiple(files, {
      folder: 'sineshop/products/videos',
      resource_type: 'video'
    });
    videos = results.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));
  }

  // Traiter les dimensions
  let dimensionsObj = null;
  if (dimensions) {
    dimensionsObj = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
  }

  // "attributes" arrive en chaîne JSON en multipart/form-data (champs
  // spécifiques à la catégorie : taille/couleur, modèle/stockage, etc.) —
  // jamais parsé jusqu'ici, ce qui aurait silencieusement rejeté ou vidé
  // ces informations à la création.
  let attributesObj = {};
  if (rest.attributes) {
    try {
      attributesObj = typeof rest.attributes === 'string' ? JSON.parse(rest.attributes) : rest.attributes;
    } catch (e) {
      attributesObj = {};
    }
  }

  // Numéro séquentiel dans sa catégorie (1er produit jamais publié dans
  // cette catégorie = 1, etc.) — voir models/Counter.js.
  const categorySequence = await nextSequence(`product_category_${category}`);

  const product = await Product.create({
    name,
    description,
    price,
    discountedPrice: rest.discountedPrice || null,
    category,
    categorySequence,
    subcategory: rest.subcategory || null,
    seller: req.user.id,
    images,
    videos,
    stock,
    weight: weight || null,
    dimensions: dimensionsObj || null,
    unit: rest.unit || 'pièce',
    brand: rest.brand || null,
    isAvailable: rest.isAvailable !== undefined ? rest.isAvailable : true,
    isFeatured: rest.isFeatured || false,
    tags: rest.tags || [],
    attributes: attributesObj,
    currency: rest.currency || 'XOF',
  });

  sendCreated(res, product, 'Product created successfully');

  // Confirmation au vendeur — ne doit jamais faire échouer la publication
  // elle-même si l'envoi d'email rencontre un problème.
  try {
    const seller = await User.findById(req.user.id);
    if (seller?.email) {
      await EmailService.sendProductPublished(seller.email, {
        name: product.name,
        price: product.price,
        currency: product.currency,
        sellerName: seller.storeName || `${seller.firstName || ''} ${seller.lastName || ''}`.trim(),
      }, seller.preferredLanguage);
    }
  } catch (error) {
    logger.error('Error sending product published email:', error);
  }
});

const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, minPrice, maxPrice, search, sort = 'newest' } = req.query;

  const query = { isAvailable: true };

  if (category) {
    query.category = category;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sortOptions = {
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
    popular: { views: -1 },
  };

  const products = await Product.find(query)
    .populate('category', 'name slug icon')
    .populate('seller', 'firstName lastName storeName')
    .sort(sortOptions[sort] || { createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(query);

  sendSuccess(res, {
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Products retrieved successfully');
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug icon description')
    .populate('seller', 'firstName lastName storeName storeLogo');

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  product.views += 1;
  await product.save();

  sendSuccess(res, product, 'Product retrieved successfully');
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('Access denied');
  }

  const commitment = await hasActiveCommitment(product._id);
  if (commitment) {
    throw new BadRequestError(commitment === 'reservation'
      ? 'Ce produit a une réservation active — modification impossible tant qu\'elle n\'est pas commandée ou expirée.'
      : 'Ce produit a une commande en cours — modification impossible tant qu\'elle n\'est pas livrée ou annulée.');
  }

  const { dimensions, ...rest } = req.body;

  if (rest.attributes) {
    try {
      rest.attributes = typeof rest.attributes === 'string' ? JSON.parse(rest.attributes) : rest.attributes;
    } catch (e) {
      delete rest.attributes;
    }
  }

  // Nouvelles images ajoutées lors de l'édition — viennent compléter celles
  // déjà en place, jusqu'à 8 au total.
  if (req.files && req.files.images && req.files.images.length) {
    const remainingSlots = 8 - product.images.length;
    if (remainingSlots <= 0) {
      throw new BadRequestError('Ce produit a déjà atteint la limite de 8 images.');
    }
    const filesToUpload = req.files.images.slice(0, remainingSlots).map(file => file.path);
    const results = await CloudinaryService.uploadProductImages(filesToUpload);
    const newImages = results.map(result => ({ url: result.secure_url, publicId: result.public_id }));
    rest.images = [...product.images, ...newImages];
  }

  // Nouvelles vidéos — jusqu'à 3 au total.
  if (req.files && req.files.videos && req.files.videos.length) {
    const remainingSlots = 3 - product.videos.length;
    if (remainingSlots <= 0) {
      throw new BadRequestError('Ce produit a déjà atteint la limite de 3 vidéos.');
    }
    const filesToUpload = req.files.videos.slice(0, remainingSlots).map(file => file.path);
    const results = await CloudinaryService.uploadMultiple(filesToUpload, {
      folder: 'sineshop/products/videos',
      resource_type: 'video',
    });
    const newVideos = results.map(result => ({ url: result.secure_url, publicId: result.public_id }));
    rest.videos = [...product.videos, ...newVideos];
  }

  if (dimensions) {
    rest.dimensions = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    rest,
    { new: true, runValidators: true }
  );

  sendSuccess(res, updatedProduct, 'Product updated successfully');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('Access denied');
  }

  const commitment = await hasActiveCommitment(product._id);
  if (commitment) {
    throw new BadRequestError(commitment === 'reservation'
      ? 'Ce produit a une réservation active — suppression impossible tant qu\'elle n\'est pas commandée ou expirée.'
      : 'Ce produit a une commande en cours — suppression impossible tant qu\'elle n\'est pas livrée ou annulée.');
  }

  // Supprimer les images
  for (const image of product.images) {
    if (image.publicId) {
      await CloudinaryService.delete(image.publicId);
    }
  }

  await product.deleteOne();

  sendSuccess(res, null, 'Product deleted successfully');
});

const getSellerProducts = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = { seller: sellerId };

  const products = await Product.find(query)
    .populate('category', 'name slug icon')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(query);

  sendSuccess(res, {
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Seller products retrieved successfully');
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
};



// Ajoute en haut du fichier après les imports
const SYSTEM_CATEGORY_SLUGS = [
    'vetements', 'chaussures', 'electronique', 'montres', 'maison',
    'sport', 'beaute', 'alimentation', 'automobile', 'livres',
    'jeux', 'service', 'autre'
];

async function resolveCategoryId(categoryInput) {
    if (!categoryInput) return null;
    
    // Si c'est déjà un ID MongoDB valide
    if (categoryInput.match(/^[0-9a-fA-F]{24}$/)) {
        return categoryInput;
    }
    
    // Si c'est un slug au format "slug:vetements"
    if (categoryInput.startsWith('slug:')) {
        const slug = categoryInput.replace('slug:', '');
        const category = await Category.findOne({ slug });
        if (category) return category._id;
        // Créer la catégorie système si elle n'existe pas
        const newCategory = await Category.create({
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
            slug: slug,
            icon: getCategoryIcon(slug)
        });
        return newCategory._id;
    }
    
    return categoryInput;
}

function getCategoryIcon(slug) {
    const icons = {
        'vetements': '👕', 'chaussures': '👟', 'electronique': '📱',
        'montres': '⌚', 'maison': '🏠', 'sport': '⚽',
        'beaute': '💄', 'alimentation': '🍎', 'automobile': '🚗',
        'livres': '📚', 'jeux': '🎮', 'service': '🛠️', 'autre': '📦'
    };
    return icons[slug] || '📦';
}
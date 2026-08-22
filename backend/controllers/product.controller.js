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

// =========================================================
// IMPORT DES FONCTIONS DE CATÉGORIE
// =========================================================
const { resolveCategoryId, getCategoryIcon } = require('./category.controller');

// =========================================================
// VÉRIFICATION DES ENGAGEMENTS ACTIFS
// =========================================================
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

// =========================================================
// CRÉER UN PRODUIT - AMÉLIORÉ
// =========================================================
const createProduct = asyncHandler(async (req, res) => {
    const { 
        name, 
        description, 
        price, 
        category, 
        stock, 
        weight, 
        dimensions, 
        subcategory,
        brand,
        model,
        condition,
        ...rest 
    } = req.body;

    // Vérification des champs obligatoires
    if (!name || !description || !price || !category || stock === undefined) {
        throw new BadRequestError('Tous les champs obligatoires doivent être remplis');
    }

    // ✅ RÉSOUD LA CATÉGORIE avec la fonction améliorée
    const categoryId = await resolveCategoryId(category);
    if (!categoryId) {
        throw new NotFoundError('Catégorie non trouvée ou invalide');
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
        throw new NotFoundError('Catégorie non trouvée');
    }

    // Upload des images
    let images = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
        const files = req.files.images.map(file => file.path);
        const results = await CloudinaryService.uploadProductImages(files);
        images = results.map(result => ({
            url: result.secure_url,
            publicId: result.public_id,
        }));
    }

    // Upload des vidéos
    let videos = [];
    if (req.files && req.files.videos && req.files.videos.length > 0) {
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
        try {
            dimensionsObj = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
        } catch (e) {
            dimensionsObj = null;
        }
    }

    // Traiter les attributs spécifiques à la catégorie
    let attributesObj = {};
    if (rest.attributes) {
        try {
            attributesObj = typeof rest.attributes === 'string' ? JSON.parse(rest.attributes) : rest.attributes;
        } catch (e) {
            attributesObj = {};
        }
    }

    // Ajouter les attributs supplémentaires du formulaire
    if (subcategory) attributesObj.subcategory = subcategory;
    if (brand) attributesObj.brand = brand;
    if (model) attributesObj.model = model;
    if (condition) attributesObj.condition = condition;

    // Numéro séquentiel dans sa catégorie
    const categorySequence = await nextSequence(`product_category_${categoryId}`);

    // Déterminer le prix final
    let finalPrice = parseFloat(price);
    let discountedPrice = null;
    if (rest.discountedPrice) {
        const discPrice = parseFloat(rest.discountedPrice);
        if (discPrice < finalPrice) {
            discountedPrice = discPrice;
        }
    }

    const product = await Product.create({
        name: name.trim(),
        description: description.trim(),
        price: finalPrice,
        discountedPrice: discountedPrice,
        currency: rest.currency || 'XOF',
        category: categoryId,
        categorySequence,
        subcategory: subcategory || null,
        seller: req.user.id,
        images,
        videos,
        stock: parseInt(stock),
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensionsObj,
        unit: rest.unit || 'pièce',
        brand: brand || null,
        model: model || null,
        condition: condition || 'new',
        isAvailable: rest.isAvailable !== undefined ? rest.isAvailable : true,
        isFeatured: rest.isFeatured || false,
        tags: rest.tags || [],
        attributes: attributesObj,
    });

    sendCreated(res, product, 'Produit créé avec succès');

    // Envoi d'email de confirmation au vendeur
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

// =========================================================
// RÉCUPÉRER LES PRODUITS - AMÉLIORÉ
// =========================================================
const getProducts = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 20, 
        category, 
        minPrice, 
        maxPrice, 
        search, 
        sort = 'newest',
        seller,
        featured,
        inStock
    } = req.query;

    const query = { isAvailable: true };

    if (category) {
        const categoryId = await resolveCategoryId(category);
        if (categoryId) query.category = categoryId;
    }

    if (seller) {
        query.seller = seller;
    }

    if (featured === 'true') {
        query.isFeatured = true;
    }

    if (inStock === 'true') {
        query.stock = { $gt: 0 };
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
        'sales-desc': { sales: -1 },
    };

    const products = await Product.find(query)
        .populate('category', 'name slug icon')
        .populate('seller', 'firstName lastName storeName storeLogo')
        .sort(sortOptions[sort] || { createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    sendSuccess(res, {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
        },
    }, 'Produits récupérés avec succès');
});

// =========================================================
// RÉCUPÉRER UN PRODUIT PAR ID - AMÉLIORÉ
// =========================================================
const getProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('category', 'name slug icon description')
        .populate('seller', 'firstName lastName storeName storeLogo storeBanner');

    if (!product) {
        throw new NotFoundError('Product not found');
    }

    // Incrémenter les vues
    product.views += 1;
    await product.save();

    // Récupérer les produits similaires (même catégorie)
    const similarProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id },
        isAvailable: true
    })
        .limit(6)
        .populate('category', 'name slug icon')
        .populate('seller', 'firstName lastName storeName');

    sendSuccess(res, {
        product,
        similar: similarProducts
    }, 'Product retrieved successfully');
});

// =========================================================
// METTRE À JOUR UN PRODUIT - AMÉLIORÉ
// =========================================================
const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new NotFoundError('Product not found');
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        throw new ForbiddenError('Access denied');
    }

    const commitment = await hasActiveCommitment(product._id);
    if (commitment) {
        throw new BadRequestError(commitment === 'reservation'
            ? 'Ce produit a une réservation active — modification impossible tant qu\'elle n\'est pas commandée ou expirée.'
            : 'Ce produit a une commande en cours — modification impossible tant qu\'elle n\'est pas livrée ou annulée.');
    }

    const { dimensions, category, ...rest } = req.body;

    // Résoudre la nouvelle catégorie si elle est fournie
    if (category) {
        const categoryId = await resolveCategoryId(category);
        if (categoryId) {
            rest.category = categoryId;
        }
    }

    // Traiter les attributs
    if (rest.attributes) {
        try {
            rest.attributes = typeof rest.attributes === 'string' ? JSON.parse(rest.attributes) : rest.attributes;
        } catch (e) {
            delete rest.attributes;
        }
    }

    // Nouvelles images ajoutées lors de l'édition
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

    // Nouvelles vidéos
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
        try {
            rest.dimensions = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
        } catch (e) {
            rest.dimensions = null;
        }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        rest,
        { new: true, runValidators: true }
    );

    sendSuccess(res, updatedProduct, 'Product updated successfully');
});

// =========================================================
// SUPPRIMER UN PRODUIT - AMÉLIORÉ
// =========================================================
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new NotFoundError('Product not found');
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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
            try {
                await CloudinaryService.delete(image.publicId);
            } catch (e) {
                logger.error('Error deleting image:', e);
            }
        }
    }

    // Supprimer les vidéos
    for (const video of product.videos) {
        if (video.publicId) {
            try {
                await CloudinaryService.delete(video.publicId, { resource_type: 'video' });
            } catch (e) {
                logger.error('Error deleting video:', e);
            }
        }
    }

    await product.deleteOne();

    sendSuccess(res, null, 'Product deleted successfully');
});

// =========================================================
// RÉCUPÉRER LES PRODUITS D'UN VENDEUR - AMÉLIORÉ
// =========================================================
const getSellerProducts = asyncHandler(async (req, res) => {
    const { sellerId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const query = { seller: sellerId };

    if (status) {
        switch (status) {
            case 'published':
                query.isAvailable = true;
                query.stock = { $gt: 0 };
                break;
            case 'draft':
                query.isAvailable = false;
                break;
            case 'outofstock':
                query.isAvailable = true;
                query.stock = 0;
                break;
        }
    }

    const products = await Product.find(query)
        .populate('category', 'name slug icon')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    sendSuccess(res, {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
        },
    }, 'Seller products retrieved successfully');
});

// =========================================================
// RÉCUPÉRER LES PRODUITS EN FAVORIS - NOUVEAU
// =========================================================
const getFavoriteStats = asyncHandler(async (req, res) => {
    const sellerId = req.user.id;

    // Récupérer tous les produits du vendeur avec leurs favoris
    const products = await Product.find({ seller: sellerId })
        .select('name images favorites')
        .lean();

    const stats = products.map(p => ({
        productId: p._id,
        productName: p.name,
        image: p.images && p.images.length > 0 ? p.images[0].url : null,
        favoriteCount: p.favorites ? p.favorites.length : 0
    })).sort((a, b) => b.favoriteCount - a.favoriteCount);

    sendSuccess(res, stats, 'Favorite stats retrieved successfully');
});

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getSellerProducts,
    getFavoriteStats,
};
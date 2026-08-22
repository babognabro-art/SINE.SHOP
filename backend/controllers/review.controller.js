// controllers/review.controller.js
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiResponse = require('../utils/ApiResponse');
const { uploadSingle } = require('../middlewares/upload.middleware');

// @desc    Ajouter un avis
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
  try {
    const { productId, rating, title, comment } = req.body;

    // Vérifier que l'utilisateur a acheté le produit
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': productId,
      status: 'delivered',
    });

    if (!hasPurchased) {
      return res.status(400).json(
        ApiResponse.error('Vous devez avoir acheté ce produit pour le noter', 400)
      );
    }

    // Vérifier si l'utilisateur a déjà noté ce produit
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
    });

    if (existingReview) {
      return res.status(400).json(
        ApiResponse.error('Vous avez déjà noté ce produit', 400)
      );
    }

    const review = await Review.create({
      product: productId,
      user: req.user.id,
      order: hasPurchased._id,
      rating,
      title,
      comment,
      verifiedPurchase: true,
    });

    // Mettre à jour les statistiques du produit
    const stats = await Review.calculateAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      rating: stats.average,
      numReviews: stats.count,
    });

    res.status(201).json(
      ApiResponse.success(review, 'Avis ajouté avec succès')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les avis d'un produit
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const filter = { product: productId, status: 'approved' };
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .populate('user', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.status(200).json(
      ApiResponse.success({
        reviews,
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

// @desc    Marquer un avis comme utile
// @route   PUT /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json(ApiResponse.error('Avis non trouvé', 404));
    }

    // Vérifier si l'utilisateur a déjà marqué comme utile
    if (review.helpful.users.includes(req.user.id)) {
      return res.status(400).json(
        ApiResponse.error('Vous avez déjà marqué cet avis comme utile', 400)
      );
    }

    review.helpful.count += 1;
    review.helpful.users.push(req.user.id);
    await review.save();

    res.status(200).json(
      ApiResponse.success({
        helpfulCount: review.helpful.count,
      }, 'Avis marqué comme utile')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Signaler un avis
// @route   PUT /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json(ApiResponse.error('Avis non trouvé', 404));
    }

    review.reported = {
      isReported: true,
      reason,
      reportedBy: req.user.id,
    };
    await review.save();

    res.status(200).json(
      ApiResponse.success(null, 'Avis signalé avec succès')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Lister les avis en attente de modération
// @route   GET /api/reviews/pending
// @access  Private (moderator, admin, superadmin)
const getPendingReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ status: 'pending' })
      .populate('user', 'firstName lastName')
      .populate('product', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(
      ApiResponse.success(reviews, 'Pending reviews retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Approuver ou rejeter un avis
// @route   PUT /api/reviews/:id/moderate
// @access  Private (moderator, admin, superadmin)
const moderateReview = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json(ApiResponse.error('Status must be "approved" or "rejected"', 400));
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json(ApiResponse.error('Avis non trouvé', 404));
    }

    review.status = status;
    await review.save();

    res.status(200).json(
      ApiResponse.success(review, 'Review moderated successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getProductReviews,
  markHelpful,
  reportReview,
  getPendingReviews,
  moderateReview,
};
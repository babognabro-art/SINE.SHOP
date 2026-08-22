const AppReview = require('../models/AppReview');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { BadRequestError, ConflictError, NotFoundError } = require('../utils/ApiError');

const createAppReview = async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('La note doit être comprise entre 1 et 5.');
    }

    // Une seule évaluation par compte. Elle ne peut pas être remplacée par
    // une nouvelle soumission : cela garantit que l'invite ne revient plus.
    const existing = await AppReview.findOne({ user: req.user.id }).lean();
    if (existing) {
      throw new ConflictError('Vous avez déjà évalué SINE.SHOP. Merci pour votre avis.');
    }

    const review = await AppReview.create({
      user: req.user.id,
      rating,
      comment,
      status: 'published',
    });

    sendCreated(res, {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      submitted: true,
      submittedAt: review.createdAt,
    }, 'Merci pour votre évaluation de SINE.SHOP.');
  } catch (error) {
    next(error);
  }
};

const getMyAppReview = async (req, res, next) => {
  try {
    const review = await AppReview.findOne({ user: req.user.id }).lean();
    sendSuccess(res, {
      submitted: !!review,
      review: review ? {
        id: review._id,
        rating: review.rating,
        comment: review.comment || '',
        submittedAt: review.createdAt,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

const getAppReviewsAdmin = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const filter = {};
    if (['published', 'hidden'].includes(req.query.status)) filter.status = req.query.status;

    const [reviews, total] = await Promise.all([
      AppReview.find(filter)
        .populate('user', 'firstName lastName email role profilePicture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AppReview.countDocuments(filter),
    ]);

    sendSuccess(res, {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const setAppReviewStatus = async (req, res, next) => {
  try {
    if (!['published', 'hidden'].includes(req.body.status)) {
      throw new BadRequestError('Statut invalide.');
    }
    const review = await AppReview.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!review) throw new NotFoundError('Avis d’application introuvable.');
    sendSuccess(res, review, 'Statut de l’avis mis à jour.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppReview,
  getMyAppReview,
  getAppReviewsAdmin,
  setAppReviewStatus,
};

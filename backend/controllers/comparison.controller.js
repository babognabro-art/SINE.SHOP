const User = require('../models/User');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/ApiError');

const MAX_COMPARISON = 4;

// GET /api/comparison — la liste de comparaison du compte connecté, avec les
// produits déjà peuplés (prêts à afficher sans requête supplémentaire).
const getComparison = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: 'comparisonList',
    populate: [
      { path: 'category', select: 'name slug icon' },
      { path: 'seller', select: 'firstName lastName storeName profilePicture' },
    ],
  });

  sendSuccess(res, user.comparisonList || [], 'Comparison list retrieved');
});

// POST /api/comparison/:productId — ajoute ou retire (bascule) un produit de
// la liste de comparaison. Limitée à 4 produits, comme annoncé côté frontend.
const toggleComparison = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.id);

  const index = user.comparisonList.findIndex(id => id.toString() === productId);
  let added;

  if (index >= 0) {
    user.comparisonList.splice(index, 1);
    added = false;
  } else {
    if (user.comparisonList.length >= MAX_COMPARISON) {
      throw new BadRequestError(`Maximum ${MAX_COMPARISON} produits en comparaison`);
    }
    user.comparisonList.push(productId);
    added = true;
  }

  await user.save();
  sendSuccess(res, { comparisonList: user.comparisonList, added }, added ? 'Product added to comparison' : 'Product removed from comparison');
});

// DELETE /api/comparison — vide toute la liste.
const clearComparison = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { comparisonList: [] });
  sendSuccess(res, null, 'Comparison list cleared');
});

module.exports = { getComparison, toggleComparison, clearComparison };

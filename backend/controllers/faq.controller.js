const FaqEntry = require('../models/FaqEntry');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');

// Recherche par pertinence — index texte MongoDB en premier essai (gère
// les variations de mots, ignore les mots vides), repli sur une
// correspondance partielle (regex insensible à la casse sur question/
// mots-clés) si la recherche texte ne renvoie rien, pour ne jamais
// laisser une question légitime sans réponse faute de correspondance
// exacte.
async function searchFaqEntries(query, role, limit = 5) {
  const roleFilter = { isActive: true, $or: [{ role: 'all' }, { role: role || 'all' }] };

  let results = await FaqEntry.find({
    ...roleFilter,
    $text: { $search: query },
  }, {
    score: { $meta: 'textScore' },
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);

  if (results.length === 0) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const regexes = words.map(w => new RegExp(w, 'i'));
      results = await FaqEntry.find({
        ...roleFilter,
        $or: [
          { question: { $in: regexes } },
          { keywords: { $in: regexes } },
        ],
      }).limit(limit);
    }
  }

  return results;
}

const searchFaq = asyncHandler(async (req, res) => {
  const { q, role } = req.query;
  if (!q || !q.trim()) {
    throw new BadRequestError('Search query is required');
  }

  const results = await searchFaqEntries(q.trim(), role, 6);
  sendSuccess(res, results, 'Search completed');
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await FaqEntry.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  sendSuccess(res, categories, 'Categories retrieved successfully');
});

const getByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { role } = req.query;

  const entries = await FaqEntry.find({
    category,
    isActive: true,
    $or: [{ role: 'all' }, { role: role || 'all' }],
  }).sort({ order: 1, question: 1 });

  sendSuccess(res, entries, 'Entries retrieved successfully');
});

const getFaqById = asyncHandler(async (req, res) => {
  const entry = await FaqEntry.findById(req.params.id).populate('relatedQuestions', 'question category');
  if (!entry) {
    throw new NotFoundError('FAQ entry not found');
  }
  entry.views += 1;
  await entry.save();
  sendSuccess(res, entry, 'Entry retrieved successfully');
});

const rateFaq = asyncHandler(async (req, res) => {
  const { helpful } = req.body;
  const entry = await FaqEntry.findById(req.params.id);
  if (!entry) {
    throw new NotFoundError('FAQ entry not found');
  }
  if (helpful) entry.helpfulCount += 1;
  else entry.notHelpfulCount += 1;
  await entry.save();
  sendSuccess(res, null, 'Feedback recorded');
});

// Les plus consultées — alimente les "questions populaires" affichées à
// l'ouverture de l'assistant, avant même toute recherche.
const getPopular = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const entries = await FaqEntry.find({
    isActive: true,
    $or: [{ role: 'all' }, { role: role || 'all' }],
  })
    .sort({ views: -1 })
    .limit(8);
  sendSuccess(res, entries, 'Popular entries retrieved successfully');
});

// --- Gestion (réservée aux admins) — permet de continuer à enrichir la
// base après ce premier lot, sans jamais devoir toucher au code. ---

const createFaq = asyncHandler(async (req, res) => {
  const entry = await FaqEntry.create(req.body);
  sendCreated(res, entry, 'FAQ entry created successfully');
});

const updateFaq = asyncHandler(async (req, res) => {
  const entry = await FaqEntry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!entry) {
    throw new NotFoundError('FAQ entry not found');
  }
  sendSuccess(res, entry, 'FAQ entry updated successfully');
});

const deleteFaq = asyncHandler(async (req, res) => {
  const entry = await FaqEntry.findByIdAndDelete(req.params.id);
  if (!entry) {
    throw new NotFoundError('FAQ entry not found');
  }
  sendSuccess(res, null, 'FAQ entry deleted successfully');
});

const getAllFaqAdmin = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 50 } = req.query;
  const filter = category ? { category } : {};
  const entries = await FaqEntry.find(filter)
    .sort({ category: 1, order: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  const total = await FaqEntry.countDocuments(filter);
  sendSuccess(res, { entries, total, page: Number(page), pages: Math.ceil(total / limit) }, 'FAQ entries retrieved successfully');
});

module.exports = {
  searchFaqEntries,
  searchFaq,
  getCategories,
  getByCategory,
  getFaqById,
  rateFaq,
  getPopular,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllFaqAdmin,
};

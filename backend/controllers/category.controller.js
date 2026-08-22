const Category = require('../models/Category');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/ApiError');
const CloudinaryService = require('../services/cloudinary.service');
const { slugify } = require('../utils/slugify');


// Catégories officielles SINE.SHOP. Elles ne dépendent pas du HTML du
// vendeur : le backend les garantit dans MongoDB dès la première lecture.
const SYSTEM_CATEGORIES = [
  { name: 'Vêtements', slug: 'vetements', icon: '👕', order: 10 },
  { name: 'Chaussures', slug: 'chaussures', icon: '👟', order: 20 },
  { name: 'Électronique', slug: 'electronique', icon: '📱', order: 30 },
  { name: 'Montres', slug: 'montres', icon: '⌚', order: 40 },
  { name: 'Maison', slug: 'maison', icon: '🏠', order: 50 },
  { name: 'Sport', slug: 'sport', icon: '⚽', order: 60 },
  { name: 'Beauté', slug: 'beaute', icon: '💄', order: 70 },
  { name: 'Alimentation', slug: 'alimentation', icon: '🍎', order: 80 },
  { name: 'Automobile', slug: 'automobile', icon: '🚗', order: 90 },
  { name: 'Livres', slug: 'livres', icon: '📚', order: 100 },
  { name: 'Jeux', slug: 'jeux', icon: '🎮', order: 110 },
  { name: 'Service', slug: 'service', icon: '🛠️', order: 120 },
  { name: 'Autre', slug: 'autre', icon: '📦', order: 999 },
];

async function ensureSystemCategories() {
  await Category.bulkWrite(
    SYSTEM_CATEGORIES.map((category) => ({
      updateOne: {
        filter: { slug: category.slug },
        update: {
          $set: {
            name: category.name,
            icon: category.icon,
            order: category.order,
            level: 0,
            parentCategory: null,
            isActive: true,
            isSystem: true,
          },
          $setOnInsert: {
            slug: category.slug,
            description: `Catégorie officielle SINE.SHOP — ${category.name}`,
            createdBy: null,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentCategory, ...rest } = req.body;

  // Vérifier si la catégorie existe déjà
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new BadRequestError('Category already exists');
  }

  // Un vendeur peut créer sa propre catégorie (ex: un besoin non couvert par
  // les catégories existantes), mais uniquement une catégorie racine — la
  // gestion des sous-catégories reste réservée aux admins pour ne pas
  // fragiliser l'arborescence commune.
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
  if (!isAdmin && parentCategory) {
    throw new ForbiddenError('Only admins can assign a parent category');
  }

  // Upload de l'image
  let image = null;
  if (req.file) {
    const result = await CloudinaryService.upload(req.file.path, {
      folder: 'sineshop/categories',
      transformation: [{ width: 400, height: 400, crop: 'fill' }]
    });
    image = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  const category = await Category.create({
    name,
    slug: slugify(name),
    description,
    parentCategory: isAdmin ? (parentCategory || null) : null,
    level: isAdmin && parentCategory ? 1 : 0,
    image,
    createdBy: req.user.id,
    ...rest,
  });

  sendCreated(res, category, 'Category created successfully');
});

const getCategories = asyncHandler(async (req, res) => {
  // Garantit la présence des catégories officielles avant toute réponse.
  // Ainsi, même sur une base neuve ou après une restauration, l'espace
  // vendeur retrouve toujours la liste SINE.SHOP.
  await ensureSystemCategories();

  const { parent, level } = req.query;

  const query = { isActive: true };
  if (parent) query.parentCategory = parent;
  if (level) query.level = Number(level);

  const categories = await Category.find(query)
    .populate('parentCategory', 'name')
    .sort({ order: 1, name: 1 });

  sendSuccess(res, categories, 'Categories retrieved successfully');
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('parentCategory', 'name');

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  sendSuccess(res, category, 'Category retrieved successfully');
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Upload nouvelle image
  if (req.file) {
    // Supprimer l'ancienne image
    if (category.image && category.image.publicId) {
      await CloudinaryService.delete(category.image.publicId);
    }

    const result = await CloudinaryService.upload(req.file.path, {
      folder: 'sineshop/categories',
      transformation: [{ width: 400, height: 400, crop: 'fill' }]
    });
    req.body.image = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  sendSuccess(res, updatedCategory, 'Category updated successfully');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Supprimer l'image
  if (category.image && category.image.publicId) {
    await CloudinaryService.delete(category.image.publicId);
  }

  await category.deleteOne();

  sendSuccess(res, null, 'Category deleted successfully');
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
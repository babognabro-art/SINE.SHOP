const Category = require('../models/Category');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/ApiError');
const CloudinaryService = require('../services/cloudinary.service');
const { slugify } = require('../utils/slugify');

// =========================================================
// ICÔNES POUR LES CATÉGORIES - EXTENDUES
// =========================================================
function getCategoryIcon(slug) {
    const icons = {
        // Catégories principales
        'vetements': '👕', 'chaussures': '👟', 'electronique': '📱',
        'montres': '⌚', 'maison': '🏠', 'sport': '⚽',
        'beaute': '💄', 'alimentation': '🍎', 'automobile': '🚗',
        'livres': '📚', 'jeux': '🎮', 'service': '🛠️', 'autre': '📦',
        // Alimentation & Boissons
        'panini': '🥪', 'glace': '🍦', 'fastfood': '🍔', 'burger': '🍔',
        'pizza': '🍕', 'sushi': '🍣', 'boulangerie': '🥖', 'patisserie': '🎂',
        'boisson': '🥤', 'sandwich': '🥪', 'salade': '🥗', 'soupe': '🍲',
        // Électronique & Accessoires
        'smartphone': '📱', 'tablette': '📱', 'ordinateur': '💻',
        'accessoire': '🔌', 'audio': '🎧', 'tv': '📺', 'photo': '📷',
        'gaming': '🎮', 'console': '🕹️', 'casque': '🎧', 'enceinte': '🔊',
        // Maison & Jardin
        'decoration': '🖼️', 'mobilier': '🪑', 'cuisine': '🍳',
        'linge': '🧺', 'jardin': '🌱', 'bricolage': '🔧', 'luminaires': '💡',
        // Sport & Loisirs
        'football': '⚽', 'basketball': '🏀', 'tennis': '🎾',
        'running': '🏃', 'fitness': '💪', 'velo': '🚴', 'natation': '🏊',
        'yoga': '🧘', 'randonnee': '🥾', 'escalade': '🧗',
        // Beauté & Soins
        'soins': '🧴', 'maquillage': '💄', 'parfum': '🌹',
        'ongles': '💅', 'cheveux': '💇', 'corps': '🧖',
        // Livres & Culture
        'roman': '📖', 'science': '🔬', 'scolaire': '📚',
        'bd': '📚', 'manga': '📚', 'art': '🎨', 'musique': '🎵',
        // Automobile
        'voiture': '🚗', 'moto': '🏍️', 'pieces': '🔧',
        'accessoires': '🛠️', 'pneus': '🏁',
        // Autres
        'formation': '📚', 'coaching': '👨‍🏫', 'consulting': '💼',
        'freelance': '💻', 'artisanat': '🔧', 'divers': '📦'
    };
    return icons[slug] || '📦';
}

// =========================================================
// FONCTION DE RÉSOLUTION D'ID DE CATÉGORIE - AMÉLIORÉE
// =========================================================
async function resolveCategoryId(categoryInput) {
    if (!categoryInput) return null;
    
    // Si c'est déjà un ID MongoDB valide (24 caractères hexadécimaux)
    if (typeof categoryInput === 'string' && categoryInput.match(/^[0-9a-fA-F]{24}$/)) {
        return categoryInput;
    }
    
    // Si c'est un slug (format "slug:vetements")
    if (typeof categoryInput === 'string' && categoryInput.startsWith('slug:')) {
        const slug = categoryInput.replace('slug:', '');
        let category = await Category.findOne({ slug });
        if (!category) {
            // Créer la catégorie système si elle n'existe pas
            category = await Category.create({
                name: slug.charAt(0).toUpperCase() + slug.slice(1),
                slug: slug,
                icon: getCategoryIcon(slug),
                isSystem: true,
                order: 999
            });
        }
        return category._id.toString();
    }
    
    // Si c'est un nom de catégorie
    if (typeof categoryInput === 'string') {
        let category = await Category.findOne({ name: { $regex: new RegExp('^' + categoryInput + '$', 'i') } });
        if (!category) {
            category = await Category.findOne({ slug: slugify(categoryInput) });
        }
        if (category) {
            return category._id.toString();
        }
        // Créer une nouvelle catégorie
        const slug = slugify(categoryInput);
        category = await Category.create({
            name: categoryInput,
            slug: slug,
            icon: '📦',
            isSystem: false,
            createdBy: null,
            order: 999
        });
        return category._id.toString();
    }
    
    // Si c'est un objet Category
    if (categoryInput && categoryInput._id) {
        return categoryInput._id.toString();
    }
    
    return null;
}

// Exporter la fonction pour qu'elle soit utilisable par d'autres contrôleurs
module.exports.resolveCategoryId = resolveCategoryId;
module.exports.getCategoryIcon = getCategoryIcon;

// =========================================================
// CATÉGORIES OFFICIELLES SINE.SHOP - EXTENDUES
// =========================================================
const SYSTEM_CATEGORIES = [
    // Catégories principales
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
    
    // Alimentation & Boissons
    { name: 'Panini', slug: 'panini', icon: '🥪', order: 81 },
    { name: 'Burger', slug: 'burger', icon: '🍔', order: 82 },
    { name: 'Pizza', slug: 'pizza', icon: '🍕', order: 83 },
    { name: 'Glace', slug: 'glace', icon: '🍦', order: 84 },
    { name: 'Sushi', slug: 'sushi', icon: '🍣', order: 85 },
    { name: 'Fast Food', slug: 'fastfood', icon: '🍟', order: 86 },
    { name: 'Boulangerie', slug: 'boulangerie', icon: '🥖', order: 87 },
    { name: 'Pâtisserie', slug: 'patisserie', icon: '🎂', order: 88 },
    { name: 'Boisson', slug: 'boisson', icon: '🥤', order: 89 },
    
    // Électronique & Accessoires
    { name: 'Smartphone', slug: 'smartphone', icon: '📱', order: 31 },
    { name: 'Tablette', slug: 'tablette', icon: '📱', order: 32 },
    { name: 'Ordinateur', slug: 'ordinateur', icon: '💻', order: 33 },
    { name: 'Accessoire', slug: 'accessoire', icon: '🔌', order: 34 },
    { name: 'Audio', slug: 'audio', icon: '🎧', order: 35 },
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

// =========================================================
// CRÉER UNE CATÉGORIE - AMÉLIORÉ
// =========================================================
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, parentCategory, icon, ...rest } = req.body;

    // Vérifier si la catégorie existe déjà (par nom ou slug)
    const slug = slugify(name);
    const existingCategory = await Category.findOne({ 
        $or: [
            { name: { $regex: new RegExp('^' + name + '$', 'i') } },
            { slug: slug }
        ]
    });
    
    if (existingCategory) {
        throw new BadRequestError('Une catégorie avec ce nom existe déjà');
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
        slug: slug,
        description,
        icon: icon || '📦',
        parentCategory: isAdmin ? (parentCategory || null) : null,
        level: isAdmin && parentCategory ? 1 : 0,
        image,
        createdBy: req.user.id,
        isSystem: false,
        ...rest,
    });

    sendCreated(res, category, 'Catégorie créée avec succès');
});

// =========================================================
// RÉCUPÉRER LES CATÉGORIES - AMÉLIORÉ
// =========================================================
const getCategories = asyncHandler(async (req, res) => {
    // Garantit la présence des catégories officielles avant toute réponse.
    await ensureSystemCategories();

    const { parent, level, search, limit = 100 } = req.query;

    const query = { isActive: true };
    if (parent) query.parentCategory = parent;
    if (level) query.level = Number(level);
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const categories = await Category.find(query)
        .populate('parentCategory', 'name slug icon')
        .sort({ order: 1, name: 1 })
        .limit(parseInt(limit));

    sendSuccess(res, categories, 'Categories retrieved successfully');
});

// =========================================================
// RÉCUPÉRER UNE CATÉGORIE PAR ID OU SLUG - AMÉLIORÉ
// =========================================================
const getCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    let category;
    
    // Vérifier si c'est un ID ou un slug
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        category = await Category.findById(id)
            .populate('parentCategory', 'name slug icon');
    } else {
        category = await Category.findOne({ slug: id })
            .populate('parentCategory', 'name slug icon');
    }

    if (!category) {
        throw new NotFoundError('Category not found');
    }

    sendSuccess(res, category, 'Category retrieved successfully');
});

// =========================================================
// METTRE À JOUR UNE CATÉGORIE
// =========================================================
const updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        throw new NotFoundError('Category not found');
    }

    // Upload nouvelle image
    if (req.file) {
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

// =========================================================
// SUPPRIMER UNE CATÉGORIE
// =========================================================
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        throw new NotFoundError('Category not found');
    }

    // Vérifier si des produits utilisent cette catégorie
    const Product = require('../models/Product');
    const productsCount = await Product.countDocuments({ category: category._id });
    if (productsCount > 0) {
        throw new BadRequestError(`Impossible de supprimer cette catégorie : ${productsCount} produit(s) l'utilisent.`);
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
    resolveCategoryId,
    getCategoryIcon,
    ensureSystemCategories,
};
const mongoose = require('mongoose');
const { slugify } = require('../utils/slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  description: String,
  icon: String,
  image: {
    url: String,
    publicId: String,
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  level: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Catégories officielles SINE.SHOP, créées automatiquement par le backend.
  // Les catégories ajoutées par les vendeurs restent à false.
  isSystem: {
    type: Boolean,
    default: false,
    index: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  // Renseigné quand la catégorie a été créée par un vendeur depuis son
  // espace plutôt que par un administrateur — permet de la distinguer
  // dans un futur outil de modération, sans rien changer à son usage.
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  translations: {
    fr: { name: String, description: String },
    en: { name: String, description: String },
    ar: { name: String, description: String },
    es: { name: String, description: String },
  },
}, {
  timestamps: true,
});

categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// Generate slug before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
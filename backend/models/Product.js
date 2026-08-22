const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0,
  },
  discountedPrice: {
    type: Number,
    min: 0,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  subcategory: String,
  // Numéro séquentiel du produit au sein de sa catégorie (1 pour le tout
  // premier produit jamais publié dans cette catégorie, 2 pour le suivant,
  // etc.) — sert de repère stable affiché/utilisé côté frontend
  // (ex: identifiant de section "vetements_000001"), indépendant de l'ordre
  // de suppression. Voir controllers/product.controller.js:createProduct.
  categorySequence: {
    type: Number,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  images: [{
    url: String,
    publicId: String,
  }],
  videos: [{
    url: String,
    publicId: String,
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    default: 'pièce',
  },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  brand: String,
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isNew: {
    type: Boolean,
    default: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  tags: [String],
  attributes: {
    type: Map,
    of: String,
  },
  views: {
    type: Number,
    default: 0,
  },
  sales: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNew: 1 });

// Calculate discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.discountedPrice && this.price > this.discountedPrice) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// Calculate final price
productSchema.virtual('finalPrice').get(function() {
  return this.discountedPrice || this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  selectedAttributes: {
    type: Map,
    of: String,
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

// Méthode pour ajouter un item
cartSchema.methods.addItem = function(product, quantity, attributes = {}) {
  const existingIndex = this.items.findIndex(
    item => item.product.toString() === product._id.toString()
  );

  if (existingIndex > -1) {
    this.items[existingIndex].quantity += quantity;
  } else {
    this.items.push({
      product: product._id,
      quantity,
      price: product.discountedPrice || product.price,
      selectedAttributes: attributes,
    });
  }

  return this.save();
};

// Méthode pour supprimer un item
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId
  );
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
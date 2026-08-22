const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  selectedAttributes: {
    type: Map,
    of: String,
  },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Identifiant partagé par toutes les commandes issues du MÊME passage en
  // caisse — un panier avec des produits de plusieurs vendeurs crée une
  // commande PAR vendeur (voir controllers/order.controller.js:createOrder),
  // chacune avec son propre statut/livraison/paiement attribué, mais toutes
  // reliées par ce groupe pour l'affichage côté client ("votre achat du
  // 8 août" regroupant plusieurs colis) et pour retrouver le paiement
  // partagé (voir models/Payment.js:orderGroup).
  orderGroup: {
    type: String,
    required: true,
    index: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'XOF',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['sinepay', 'card', 'wave', 'orange_money', 'mtn_money', 'visa', 'mastercard', 'cash_on_delivery'],
    required: true,
  },
  paymentIntentId: String,
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    phone: String,
  },
  trackingNumber: String,
  deliveryDate: Date,
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: String,
  cancellationReason: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
}, {
  timestamps: true,
});

// Indexes
orderSchema.index({ user: 1 });
orderSchema.index({ seller: 1 });
orderSchema.index({ orderGroup: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order number
orderSchema.virtual('orderNumber').get(function() {
  return `SINE-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Virtual for total items
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
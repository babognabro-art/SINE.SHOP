const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const AIService = require('../services/ai.service');

// Récupérer le panier
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id })
    .populate({ path: 'items.product', select: 'name price discountedPrice images stock isAvailable category', populate: { path: 'category', select: 'name' } });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  // Analyse IA du panier
  const aiAnalysis = await AIService.analyzeCart(cart, req.user);

  sendSuccess(res, {
    cart,
    aiAnalysis,
  }, 'Cart retrieved successfully');
});

// Ajouter au panier
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, selectedAttributes = {} } = req.body;

  if (!productId) {
    throw new BadRequestError('Product ID is required');
  }

  if (quantity < 1) {
    throw new BadRequestError('Quantity must be at least 1');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (!product.isAvailable) {
    throw new BadRequestError('Product is not available');
  }

  if (product.stock < quantity) {
    throw new BadRequestError(`Only ${product.stock} items available in stock`);
  }

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (product.stock < newQuantity) {
      throw new BadRequestError(`Only ${product.stock} items available in stock`);
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.discountedPrice || product.price,
      selectedAttributes,
    });
  }

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'name price discountedPrice images stock isAvailable category', populate: { path: 'category', select: 'name' } });

  // Analyse IA du panier après ajout
  const aiAnalysis = await AIService.analyzeCart(cart, req.user);

  // Notification proactive IA
  if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
    await AIService.sendCartRecommendations(req.user.id, aiAnalysis.recommendations);
  }

  sendSuccess(res, {
    cart,
    aiAnalysis,
  }, 'Product added to cart successfully');
});

// Retirer du panier (diminuer la quantité)
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Product not found in cart');
  }

  if (cart.items[itemIndex].quantity > 1) {
    cart.items[itemIndex].quantity -= 1;
  } else {
    cart.items.splice(itemIndex, 1);
  }

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'name price discountedPrice images stock category', populate: { path: 'category', select: 'name' } });

  sendSuccess(res, cart, 'Product removed from cart successfully');
});

// Supprimer complètement du panier
const deleteFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Product not found in cart');
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();
  await cart.populate({ path: 'items.product', select: 'name price discountedPrice images stock category', populate: { path: 'category', select: 'name' } });

  sendSuccess(res, cart, 'Product deleted from cart successfully');
});

// Vider le panier
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  cart.items = [];
  await cart.save();

  sendSuccess(res, cart, 'Cart cleared successfully');
});

// Mettre à jour la quantité
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId) {
    throw new BadRequestError('Product ID is required');
  }

  if (quantity < 0) {
    throw new BadRequestError('Quantity must be 0 or greater');
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Product not found in cart');
  }

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} items available in stock`);
    }
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'name price discountedPrice images stock category', populate: { path: 'category', select: 'name' } });

  sendSuccess(res, cart, 'Cart updated successfully');
});

// Mettre à jour les variantes choisies d'un article déjà présent dans le
// panier (taille/couleur/matière/etc. selon la catégorie du produit) —
// jusqu'ici, seule la quantité pouvait être modifiée après ajout.
const updateCartItemAttributes = asyncHandler(async (req, res) => {
  const { productId, selectedAttributes = {} } = req.body;

  if (!productId) {
    throw new BadRequestError('Product ID is required');
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Product not found in cart');
  }

  cart.items[itemIndex].selectedAttributes = selectedAttributes;

  await cart.save();
  await cart.populate({ path: 'items.product', select: 'name price discountedPrice images stock isAvailable category', populate: { path: 'category', select: 'name' } });

  sendSuccess(res, cart, 'Cart item attributes updated successfully');
});

// Obtenir le total du panier
const getCartTotal = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id })
    .populate('items.product', 'price discountedPrice');

  if (!cart || cart.items.length === 0) {
    return sendSuccess(res, { total: 0, items: 0, subtotal: 0 }, 'Cart is empty');
  }

    const subtotal = cart.items.reduce((sum, item) => {
    if (!item.product) return sum; // article orphelin (produit supprimé) — ignoré au lieu de planter
    const price = item.product.discountedPrice || item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Calcul des frais (simulés)
  const shipping = subtotal > 50000 ? 0 : 2000;
  const tax = subtotal * 0.1;

  sendSuccess(res, {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    totalItems,
    currency: req.user.preferredCurrency || 'XOF',
  }, 'Cart total calculated successfully');
});

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  deleteFromCart,
  clearCart,
  updateCartItem,
  updateCartItemAttributes,
  getCartTotal,
};
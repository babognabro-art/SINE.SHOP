const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const PaymentService = require('../services/payment.service');
const EmailService = require('../services/email.service');
const NotificationService = require('../services/notification.service');
const InvoiceService = require('../services/invoice.service');
const SMSService = require('../services/sms.service');
const SocketService = require('../services/socket.service');
const AIService = require('../services/ai.service');
const { generateUUID } = require('../utils/generateToken');
const logger = require('../utils/logger');
const { creditReferralForOrder } = require('../services/affiliate.service');

// Crée une (ou plusieurs) commande(s) — une commande PAR vendeur si le
// panier contient des produits de vendeurs différents, toutes reliées par
// un orderGroup commun et partageant un seul paiement (le client ne paie
// qu'une fois, même si son achat est réparti entre plusieurs vendeurs).
// Chaque vendeur ne voit et ne gère que SA propre commande — c'est ce qui
// permet une répartition financière et un suivi correct par vendeur.
const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, shippingAddress, notes, useCart = true } = req.body;

  // itemsBySeller: Map<sellerId, orderItem[]>
  const itemsBySeller = new Map();

  if (useCart) {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    // Vérifier les stocks
    for (const item of cart.items) {
      const product = item.product;
      if (!product.isAvailable || product.stock < item.quantity) {
        throw new BadRequestError(`Product ${product.name} is not available or insufficient stock`);
      }
    }

    for (const item of cart.items) {
      const sellerKey = item.product.seller.toString();
      const orderItem = {
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        selectedAttributes: item.selectedAttributes || {},
      };
      if (!itemsBySeller.has(sellerKey)) itemsBySeller.set(sellerKey, []);
      itemsBySeller.get(sellerKey).push(orderItem);
    }
  } else {
    // Commande directe (sans panier) — toujours un seul vendeur
    const { productId, quantity = 1, selectedAttributes = {} } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    if (!product.isAvailable || product.stock < quantity) {
      throw new BadRequestError('Product not available or insufficient stock');
    }

    const orderItem = {
      product: product._id,
      quantity,
      price: product.discountedPrice || product.price,
      total: (product.discountedPrice || product.price) * quantity,
      selectedAttributes,
    };
    itemsBySeller.set(product.seller.toString(), [orderItem]);
  }

  const orderGroup = generateUUID();
  const currency = req.user.preferredCurrency || 'XOF';
  const defaultShippingAddress = shippingAddress || {
    street: req.user.address?.street || '',
    city: req.user.address?.city || '',
    state: req.user.address?.state || '',
    country: req.user.address?.country || '',
    postalCode: req.user.address?.postalCode || '',
    phone: req.user.phone || '',
  };

  // Une commande par vendeur — chacune avec son propre sous-total, ses
  // propres frais de livraison et sa propre part de taxe, calculés sur SA
  // part du panier uniquement (jamais sur le total global du panier).
  const createdOrders = [];
  let grandTotal = 0;

  for (const [sellerId, items] of itemsBySeller.entries()) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const shippingCost = 1000; // À affiner selon poids/distance (voir Product.weight)
    const tax = subtotal * 0.1;
    const total = subtotal + shippingCost + tax;
    grandTotal += total;

    const order = await Order.create({
      user: req.user.id,
      orderGroup,
      seller: sellerId,
      items,
      subtotal,
      shippingCost,
      tax,
      total,
      currency,
      paymentMethod,
      shippingAddress: defaultShippingAddress,
      notes,
      status: 'pending',
      paymentStatus: 'pending',
    });

    createdOrders.push(order);

    // Notification au VENDEUR — n'existait pas du tout jusqu'ici : un
    // vendeur recevant une commande n'en était jamais informé
    // automatiquement, ni email/SMS/push ni même en interne sur son
    // tableau de bord. Lien direct vers sa section Commandes.
    try {
      await NotificationService.send({
        userId: sellerId,
        type: 'order_created',
        title: `🛒 Nouvelle commande #${order.orderNumber || order._id}`,
        message: `Vous avez reçu une nouvelle commande de ${items.length} article(s) pour un total de ${total} ${currency}.`,
        data: { orderId: order._id, orderNumber: order.orderNumber, link: '../html/vendeur.html?section=commandes' },
        priority: 'high',
        channels: ['in_app', 'push'],
        eventId: order._id,
        eventModel: 'Order',
      });
    } catch (notifError) {
      console.error('Error notifying seller of new order:', notifError);
    }
  }

  // Un seul paiement pour tout le groupe — le client règle le montant total
  // en une fois, même si l'achat couvre plusieurs vendeurs.
  let paymentIntent = { id: null, client_secret: null };
  let payment = null;

  if (paymentMethod !== 'cash_on_delivery') {
    paymentIntent = await PaymentService.createIntent(
      grandTotal,
      currency,
      { orderGroup, userId: req.user.id }
    );

    payment = await Payment.create({
      user: req.user.id,
      order: createdOrders[0]._id,
      orderGroup,
      amount: grandTotal,
      currency,
      method: paymentMethod,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
    });

    for (const order of createdOrders) {
      order.paymentIntentId = paymentIntent.id;
      await order.save();
    }
  } else {
    payment = await Payment.create({
      user: req.user.id,
      order: createdOrders[0]._id,
      orderGroup,
      amount: grandTotal,
      currency,
      method: paymentMethod,
      status: 'pending',
    });
  }

  // Réduire les stocks (toutes commandes confondues)
  for (const order of createdOrders) {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      product.stock -= item.quantity;
      product.sales += item.quantity;
      await product.save();
    }
  }

  // Vider le panier si utilisé
  if (useCart) {
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] }
    );
  }

  // Analyse IA + détection de fraude — par commande (une par vendeur), sans
  // qu'un échec sur l'une bloque les autres.
  const aiAnalyses = [];
  for (const order of createdOrders) {
    try {
      const aiAnalysis = await AIService.analyzeOrder(order, req.user);
      aiAnalyses.push({ orderId: order._id, ...aiAnalysis });

      const fraudScore = await AIService.detectFraud(order, req.user);
      if (fraudScore > 0.7) {
        await AIService.sendFraudAlert(order, req.user);
      }
    } catch (error) {
      logger.error('Error during AI analysis for order', order._id, error);
    }
  }

  // Une seule confirmation par email/SMS pour tout l'achat, listant chaque
  // commande (donc chaque vendeur) séparément — pas un email par vendeur.
  try {
    await EmailService.sendOrderConfirmationGroup(req.user.email, req.user.firstName, createdOrders, orderGroup, req.user.preferredLanguage);
    await SMSService.sendOrderConfirmation(req.user.phone, createdOrders[0].orderNumber, grandTotal);
  } catch (error) {
    logger.error('Error sending notifications:', error);
  }

  // Notifications en temps réel — une par commande, chaque vendeur reçoit
  // aussi la sienne pour voir sa nouvelle commande apparaître immédiatement.
  for (const order of createdOrders) {
    SocketService.notifyOrderUpdate(req.user.id, order);
    SocketService.sendToUser(order.seller.toString(), 'new-order', { order });
  }

  sendCreated(res, {
    orders: createdOrders,
    orderGroup,
    total: grandTotal,
    paymentIntent: {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    },
    aiAnalyses,
  }, createdOrders.length > 1
    ? `Order created successfully (split into ${createdOrders.length} orders across sellers)`
    : 'Order created successfully');
});

// Confirmer une commande (paiement réussi) — confirme en réalité TOUT le
// groupe (voir orderGroup) : si l'achat était réparti entre plusieurs
// vendeurs, chacune de leurs commandes est confirmée en même temps,
// puisqu'elles partagent le même paiement.
const confirmOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentIntentId } = req.body;

  const order = await Order.findById(orderId)
    .populate('user', 'firstName lastName email phone preferredLanguage');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  if (order.status === 'confirmed') {
    throw new BadRequestError('Order already confirmed');
  }

  if (order.status === 'cancelled') {
    throw new BadRequestError('Order has been cancelled');
  }

  // Confirmer le paiement
  const confirmedPayment = await PaymentService.confirmPayment(
    paymentIntentId || order.paymentIntentId
  );

  if (confirmedPayment.status === 'succeeded') {
    const siblingOrders = await Order.find({ orderGroup: order.orderGroup });

    for (const siblingOrder of siblingOrders) {
      siblingOrder.status = 'confirmed';
      siblingOrder.paymentStatus = 'paid';
      await siblingOrder.save();
      await creditReferralForOrder(siblingOrder);
    }

    // Mettre à jour le paiement partagé
    await Payment.findOneAndUpdate(
      { orderGroup: order.orderGroup },
      { status: 'success' }
    );

    // Analyse IA (sur la commande d'origine, pour la réponse HTTP)
    const aiAnalysis = await AIService.analyzeOrder(order, req.user);

    // Une seule notification pour tout le groupe
    await EmailService.sendPaymentReceipt(order.user.email, {
      userName: order.user.firstName,
      orderNumber: siblingOrders.length > 1 ? siblingOrders.map(o => o.orderNumber).join(', ') : order.orderNumber,
      order: order._id,
      amount: siblingOrders.reduce((sum, o) => sum + o.total, 0),
      currency: order.currency,
      method: order.paymentMethod,
    }, order.user.preferredLanguage);

    for (const siblingOrder of siblingOrders) {
      SocketService.notifyOrderUpdate(order.user._id, siblingOrder);
    }

    sendSuccess(res, {
      orders: siblingOrders,
      aiAnalysis,
    }, 'Order confirmed successfully');
  } else {
    const siblingOrders = await Order.find({ orderGroup: order.orderGroup });
    for (const siblingOrder of siblingOrders) {
      siblingOrder.status = 'pending';
      siblingOrder.paymentStatus = 'failed';
      await siblingOrder.save();
    }

    throw new BadRequestError('Payment confirmation failed');
  }
});

// Suivi en temps réel de la commande
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('user', 'firstName lastName email phone address')
    .populate('items.product', 'name images')
    .populate('livreur', 'firstName lastName phone location vehicleType gender');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Vérifier les accès
  if (order.user._id.toString() !== req.user.id &&
      order.livreur?._id?.toString() !== req.user.id &&
      order.seller?.toString() !== req.user.id &&
      req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  // Calculer les étapes de livraison
  const steps = [
    { status: 'pending', label: 'Commande reçue', completed: true },
    { status: 'confirmed', label: 'Commande confirmée', completed: order.status !== 'pending' },
    { status: 'processing', label: 'Préparation de la commande', completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
    { status: 'shipped', label: 'Expédiée', completed: ['shipped', 'delivered'].includes(order.status) },
    { status: 'delivered', label: 'Livrée', completed: order.status === 'delivered' },
  ];

  const currentStep = steps.findIndex(s => s.status === order.status);
  const progress = Math.round((currentStep / (steps.length - 1)) * 100);

  // Position du livreur
  let livreurLocation = null;
  if (order.livreur && order.livreur.location) {
    livreurLocation = order.livreur.location;
  }

  // Calcul du temps estimé
  let estimatedTime = null;
  if (order.status === 'processing' || order.status === 'shipped') {
    const createdAt = new Date(order.createdAt);
    const estimated = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000); // +3 heures
    estimatedTime = estimated.toISOString();
  }

  // Analyse IA du suivi
  const aiAnalysis = await AIService.trackOrderAnalysis(order, req.user);

  // Mise à jour du suivi en temps réel via Socket
  if (req.user.id === order.user._id.toString()) {
    SocketService.sendToUser(req.user.id, 'order-tracking-update', {
      orderId: order._id,
      status: order.status,
      progress,
      livreurLocation,
      estimatedTime,
    });
  }

  sendSuccess(res, {
    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      progress,
      currentStep: steps[currentStep]?.label || 'En cours',
      steps,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      estimatedTime,
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      paymentMethod: order.paymentMethod,
    },
    livreur: order.livreur ? {
      id: order.livreur._id,
      name: `${order.livreur.firstName} ${order.livreur.lastName}`,
      phone: order.livreur.phone,
      location: livreurLocation,
      vehicleType: order.livreur.vehicleType,
      gender: order.livreur.gender || 'non-precise',
    } : null,
    items: order.items,
    aiAnalysis,
  }, 'Order tracking retrieved successfully');
});

// Mettre à jour le statut de livraison (pour livreur)
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, location } = req.body;

  const order = await Order.findById(orderId)
    .populate('user', 'firstName lastName email phone');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.livreur?.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  order.status = status;
  if (status === 'delivered') {
    order.deliveredAt = new Date();
  }

  if (location) {
    await User.findByIdAndUpdate(req.user.id, {
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      }
    });
  }

  await order.save();

  // Email au client à chaque étape clé de la livraison
  try {
    if (status === 'shipped') {
      await EmailService.sendShipped(order.user.email, order, order.user.preferredLanguage);
    } else if (status === 'delivered') {
      await EmailService.sendDelivered(order.user.email, order, order.user.preferredLanguage);
    }
  } catch (error) {
    console.error('Error sending delivery status email:', error);
  }

  // Notification in-app + push (persistée, historique visible côté
  // client) — email/SMS déjà envoyés ci-dessus/ci-dessous, canaux exclus
  // ici pour ne jamais doubler le même message.
  try {
    if (status === 'shipped' || status === 'delivered') {
      await NotificationService.send({
        userId: order.user._id,
        type: status === 'shipped' ? 'order_shipped' : 'order_delivered',
        title: status === 'shipped' ? `Commande #${order.orderNumber} expédiée 📦` : `Commande #${order.orderNumber} livrée 🎉`,
        message: status === 'shipped' ? 'Votre commande est en route !' : 'Votre commande a été livrée avec succès.',
        data: { orderId: order._id, orderNumber: order.orderNumber },
        priority: 'high',
        channels: ['in_app', 'push'],
        eventId: order._id,
        eventModel: 'Order',
      });
    }
  } catch (error) {
    logger.error('Error sending in-app/push delivery notification:', error);
  }

  // Notification en temps réel au client
  SocketService.sendToUser(order.user._id, 'delivery-status-update', {
    orderId: order._id,
    status: order.status,
    deliveredAt: order.deliveredAt,
    livreurLocation: location,
  });

  // Notification SMS
  await SMSService.sendOrderUpdate(
    order.user.phone,
    order.orderNumber,
    status
  );

  // Analyse IA
  await AIService.analyzeDeliveryUpdate(order, req.user);

  sendSuccess(res, order, 'Delivery status updated successfully');
});

// Obtenir l'historique des commandes
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { user: req.user.id };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('items.product', 'name images')
    .populate('seller', 'firstName lastName storeName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  // Analyse IA de l'historique
  const aiAnalysis = await AIService.analyzeOrderHistory(orders, req.user);

  sendSuccess(res, {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    aiAnalysis,
  }, 'Orders retrieved successfully');
});

// Obtenir toutes les commandes d'un même passage en caisse (un panier
// réparti entre plusieurs vendeurs = plusieurs commandes reliées par ce
// groupe) — utilisé par la page de confirmation pour afficher l'achat
// complet plutôt qu'une seule commande.
const getOrderGroup = asyncHandler(async (req, res) => {
  const { orderGroup } = req.params;

  const orders = await Order.find({ orderGroup })
    .populate('items.product', 'name images')
    .populate('seller', 'firstName lastName storeName')
    .populate('user', 'firstName lastName email phone')
    .sort({ createdAt: 1 });

  if (orders.length === 0) {
    throw new NotFoundError('Order group not found');
  }

  if (orders[0].user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  const total = orders.reduce((sum, o) => sum + o.total, 0);

  sendSuccess(res, {
    orders,
    orderGroup,
    total,
    currency: orders[0].currency,
  }, 'Order group retrieved successfully');
});

// Obtenir une commande spécifique
// Facture HTML imprimable/téléchargeable d'une commande — même contrôle
// d'accès que getOrder (client, vendeur concerné, livreur, admin).
const getOrderInvoice = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('items.product', 'name images price')
    .populate('user', 'firstName lastName email phone')
    .populate('seller', 'firstName lastName storeName email');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.user._id.toString() !== req.user.id &&
      order.seller?._id?.toString() !== req.user.id &&
      req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  const invoice = await InvoiceService.build(order);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(invoice.html);
});

const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('items.product', 'name images price')
    .populate('user', 'firstName lastName email phone')
    .populate('seller', 'firstName lastName storeName')
    .populate('livreur', 'firstName lastName phone location');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Vérifier les accès
  if (order.user._id.toString() !== req.user.id &&
      order.livreur?._id?.toString() !== req.user.id &&
      order.seller?.toString() !== req.user.id &&
      req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  // Analyse IA
  const aiAnalysis = await AIService.analyzeOrder(order, req.user);

  sendSuccess(res, {
    order,
    aiAnalysis,
  }, 'Order retrieved successfully');
});

// Annuler une commande — n'annule QUE la commande de ce vendeur, jamais
// les autres commandes du même groupe (un client peut vouloir annuler la
// part d'un vendeur sans toucher aux autres).
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(orderId)
    .populate('user', 'firstName lastName email phone');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  if (order.status !== 'pending' && order.status !== 'confirmed') {
    throw new BadRequestError('Order cannot be cancelled');
  }

  order.status = 'cancelled';
  order.cancellationReason = reason || 'User cancelled';
  await order.save();

  // Restaurer les stocks — uniquement ceux de CETTE commande
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }

  // Remboursement si payé — jamais automatique si ce n'est pas la SEULE
  // commande du groupe : le paiement partagé couvre aussi d'autres
  // vendeurs encore valides, un remboursement automatique du paiement
  // entier leur ferait perdre à tort leur propre part. Dans ce cas, on
  // marque juste qu'un remboursement partiel manuel est nécessaire
  // (cohérent avec le fonctionnement de CinetPay, qui n'offre de toute
  // façon pas de remboursement automatique — voir config/payment.js).
  let manualRefundRequired = false;
  if (order.paymentStatus === 'paid') {
    const siblingCount = await Order.countDocuments({ orderGroup: order.orderGroup });
    const payment = await Payment.findOne({ orderGroup: order.orderGroup });

    if (siblingCount <= 1) {
      // Seule commande du groupe : remboursement classique du paiement entier.
      if (payment && payment.paymentIntentId) {
        await PaymentService.refund(payment.paymentIntentId);
        payment.status = 'refunded';
        await payment.save();
      }
    } else {
      // Autres commandes du groupe encore valides : ne pas toucher au
      // paiement partagé, juste signaler qu'un remboursement partiel de
      // la part de CE vendeur (order.total) doit être fait manuellement.
      manualRefundRequired = true;
      logger.warn(`Remboursement partiel manuel requis : commande ${order._id} (${order.total} ${order.currency}) annulée dans un groupe payé de ${siblingCount} commandes — paiement partagé ${payment?._id} laissé intact.`);
    }
  }

  // Notification
  SocketService.sendToUser(order.user._id, 'order-cancelled', {
    orderId: order._id,
    reason: order.cancellationReason,
  });

  sendSuccess(res, { order, manualRefundRequired }, 'Order cancelled successfully');
});

// Obtenir les commandes d'un vendeur
const getSellerOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const sellerId = req.user.id;

  const query = { seller: sellerId };
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('user', 'firstName lastName email phone')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  // Analyse IA pour le vendeur
  const aiAnalysis = await AIService.analyzeSellerOrders(orders, req.user);

  sendSuccess(res, {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    aiAnalysis,
  }, 'Seller orders retrieved successfully');
});

module.exports = {
  createOrder,
  confirmOrder,
  trackOrder,
  updateDeliveryStatus,
  getOrders,
  getOrder,
  getOrderInvoice,
  getOrderGroup,
  cancelOrder,
  getSellerOrders,
};
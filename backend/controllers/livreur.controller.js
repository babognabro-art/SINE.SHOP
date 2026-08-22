const User = require('../models/User');
const Order = require('../models/Order');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const SocketService = require('../services/socket.service');
const EmailService = require('../services/email.service');
const SMSService = require('../services/sms.service');
const NotificationService = require('../services/notification.service');
const logger = require('../utils/logger');

const getLivreurProfile = asyncHandler(async (req, res) => {
  const livreur = await User.findById(req.params.id || req.user.id)
    .select('-password -refreshToken');

  if (!livreur) {
    throw new NotFoundError('Livreur not found');
  }

  if (livreur.role !== 'livreur' && livreur.role !== 'admin') {
    throw new BadRequestError('User is not a livreur');
  }

  sendSuccess(res, livreur, 'Livreur profile retrieved successfully');
});

const updateLivreurLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    throw new BadRequestError('Latitude and longitude are required');
  }

  const livreur = await User.findById(req.user.id);
  if (!livreur) {
    throw new NotFoundError('Livreur not found');
  }

  livreur.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  await livreur.save();

  // Notifier les clients
  SocketService.sendToAll('livreur-location-update', {
    livreurId: livreur._id,
    location: livreur.location,
  });

  sendSuccess(res, livreur, 'Location updated successfully');
});

const getAvailableLivreurs = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10 } = req.query;

  const query = {
    role: 'livreur',
    isAvailable: true,
    status: 'active',
  };

  if (latitude && longitude) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        $maxDistance: radius * 1000, // Convertir en mètres
      },
    };
  }

  const livreurs = await User.find(query)
    .select('firstName lastName phone location vehicleType isAvailable');

  sendSuccess(res, livreurs, 'Available livreurs retrieved successfully');
});

const assignLivreurToOrder = asyncHandler(async (req, res) => {
  const { orderId, livreurId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== 'pending' && order.status !== 'confirmed') {
    throw new BadRequestError('Order cannot be assigned');
  }

  const livreur = await User.findById(livreurId);
  if (!livreur || livreur.role !== 'livreur') {
    throw new NotFoundError('Livreur not found');
  }

  if (!livreur.isAvailable) {
    throw new BadRequestError('Livreur is not available');
  }

  order.livreur = livreurId;
  order.status = 'processing';
  await order.save();

  // Notifier le livreur en temps réel (déjà existant)...
  SocketService.sendToUser(livreurId, 'new-delivery-assigned', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    total: order.total,
    currency: order.currency,
  });

  // Notifier le client
  SocketService.sendToUser(order.user, 'delivery-assigned', {
    orderId: order._id,
    livreur: {
      id: livreur._id,
      name: `${livreur.firstName} ${livreur.lastName}`,
      phone: livreur.phone,
    },
  });

  // ...ET persister une vraie notification au livreur (même correctif que
  // partout ailleurs cette session : sans ça, un livreur non connecté au
  // moment exact de l'attribution ne la voyait jamais nulle part ensuite).
  try {
    await NotificationService.send({
      userId: livreurId,
      type: 'delivery_update',
      title: `🚚 Nouvelle livraison à prendre en charge`,
      message: `Commande #${order.orderNumber || order._id} — ${order.total} ${order.currency}. Rendez-vous chez le vendeur pour la récupérer.`,
      data: { orderId: order._id, orderNumber: order.orderNumber, link: '../html/livreur.html?section=livraisons' },
      priority: 'high',
      channels: ['in_app', 'push'],
      eventId: order._id,
      eventModel: 'Order',
    });
  } catch (notifError) {
    console.error('Error notifying livreur of new delivery:', notifError);
  }

  sendSuccess(res, order, 'Livreur assigned successfully');
});

// Met à jour le statut d'une livraison — appelée par livreur.html à chaque
// étape (📦 Livrer, etc.). Alignée sur la version plus complète de
// order.controller.js:updateDeliveryStatus (email + SMS au client à chaque
// étape clé) : jusqu'ici cette version-ci ne notifiait le client par
// AUCUN canal, silencieusement — le client ne savait jamais que sa
// commande avait été expédiée ou livrée.
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId, status, location } = req.body;

  const order = await Order.findById(orderId)
    .populate('user', 'firstName lastName email phone preferredLanguage');
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // order.livreur peut être vide (commande jamais assignée) — l'appel sans
  // vérification faisait planter cette route avec une exception non gérée.
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

  // Email + SMS au client à chaque étape clé — jusqu'ici absents sur ce
  // chemin (seule la version de order.controller.js les envoyait).
  try {
    if (status === 'shipped') {
      await EmailService.sendShipped(order.user.email, order, order.user.preferredLanguage);
    } else if (status === 'delivered') {
      await EmailService.sendDelivered(order.user.email, order, order.user.preferredLanguage);
    }
    if (order.user.phone) {
      await SMSService.sendOrderUpdate(order.user.phone, order.orderNumber, status);
    }
  } catch (error) {
    logger.error('Error sending delivery status notification:', error);
  }

  // Notification in-app + push (persistée, visible dans l'historique de
  // notifications du client) — canaux email/sms volontairement exclus ici
  // puisqu'ils viennent d'être envoyés juste au-dessus, pour ne jamais
  // doubler le même message sur le même canal.
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

  // Notifier le client
  SocketService.sendToUser(order.user._id, 'delivery-status-update', {
    orderId: order._id,
    status: order.status,
    deliveredAt: order.deliveredAt,
    livreurLocation: location,
  });

  sendSuccess(res, order, 'Delivery status updated successfully');
});

const getLivreurDeliveries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const livreurId = req.params.id || req.user.id;

  const query = { livreur: livreurId };
  if (status) query.status = status;

  // Bug corrigé : le vendeur n'était jamais renvoyé au livreur (ni son
  // nom de boutique, ni son adresse, ni son téléphone) — impossible de
  // savoir concrètement OÙ aller récupérer la commande avant de livrer.
  const orders = await Order.find(query)
    .populate('user', 'firstName lastName email phone address')
    .populate('seller', 'storeName firstName lastName phone address storeAddress')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  // Achat multi-vendeurs (orderGroup partagé) — le livreur voit désormais
  // les AUTRES commandes du même groupe (chez d'autres vendeurs, pour le
  // même client) : il sait qu'il doit passer récupérer plusieurs colis
  // séparés avant de les assembler pour une livraison unique au client.
  // N'existait pas du tout avant — chaque commande semblait isolée.
  const groupIds = [...new Set(orders.filter(o => o.orderGroup).map(o => String(o.orderGroup)))];
  let siblingsByGroup = {};
  if (groupIds.length) {
    const siblings = await Order.find({ orderGroup: { $in: groupIds } })
      .populate('seller', 'storeName phone storeAddress address')
      .select('orderGroup seller status orderNumber total items livreur');
    siblingsByGroup = siblings.reduce((acc, s) => {
      const key = String(s.orderGroup);
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }

  const ordersWithGroup = orders.map(o => {
    const obj = o.toObject();
    if (o.orderGroup) {
      const allInGroup = siblingsByGroup[String(o.orderGroup)] || [];
      obj.groupSiblings = allInGroup.filter(s => String(s._id) !== String(o._id));
      obj.isMultiVendorGroup = allInGroup.length > 1;
    }
    return obj;
  });

  sendSuccess(res, {
    orders: ordersWithGroup,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Deliveries retrieved successfully');
});

module.exports = {
  getLivreurProfile,
  updateLivreurLocation,
  getAvailableLivreurs,
  assignLivreurToOrder,
  updateDeliveryStatus,
  getLivreurDeliveries,
};
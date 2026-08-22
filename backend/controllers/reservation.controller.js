const Reservation = require('../models/Reservation');
const Product = require('../models/Product');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const EmailService = require('../services/email.service');
const SocketService = require('../services/socket.service');
const NotificationService = require('../services/notification.service');

const createReservation = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, startDate, endDate, notes } = req.body;

  if (!productId || !startDate || !endDate) {
    throw new BadRequestError('Product ID, start date and end date are required');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (!product.isAvailable || product.stock < quantity) {
    throw new BadRequestError('Product not available or insufficient stock');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new BadRequestError('End date must be after start date');
  }

  // Vérifier les conflits de réservation
  const conflictingReservations = await Reservation.find({
    product: productId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { startDate: { $lt: end, $gte: start } },
      { endDate: { $gt: start, $lte: end } },
    ],
  });

  if (conflictingReservations.length > 0) {
    throw new BadRequestError('Product already reserved for this period');
  }

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const totalPrice = product.price * quantity * days;

  const reservation = await Reservation.create({
    user: req.user.id,
    product: productId,
    quantity,
    startDate: start,
    endDate: end,
    totalPrice,
    notes,
  });

  await reservation.populate('product', 'name images');
  await reservation.populate('user', 'firstName lastName email');

  // Notifier le vendeur en temps réel (déjà existant)...
  SocketService.sendToUser(product.seller.toString(), 'new-reservation', {
    reservationId: reservation._id,
    productName: product.name,
    user: `${req.user.firstName} ${req.user.lastName}`,
  });

  // ...ET persister une vraie notification en base (n'existait pas avant :
  // si le vendeur n'était pas connecté au moment exact de la réservation,
  // il ne la voyait jamais nulle part ensuite — le socket seul ne suffit
  // pas, rien ne réapparaît dans sa section Notifications au retour).
  try {
    await NotificationService.send({
      userId: product.seller,
      type: 'reservation_created',
      title: `📅 Nouvelle réservation`,
      message: `${req.user.firstName} ${req.user.lastName} a réservé ${quantity} × ${product.name}.`,
      data: { reservationId: reservation._id, link: '../html/vendeur.html?section=reservations' },
      priority: 'high',
      channels: ['in_app', 'push'],
      eventId: reservation._id,
      eventModel: 'Reservation',
    });
  } catch (notifError) {
    console.error('Error notifying seller of new reservation:', notifError);
  }

  sendCreated(res, reservation, 'Reservation created successfully');
});

const getReservations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, upcoming } = req.query;

  const query = { user: req.user.id };
  if (status) query.status = status;
  if (upcoming === 'true') {
    query.endDate = { $gte: new Date() };
  }

  const reservations = await Reservation.find(query)
    .populate('product', 'name images price')
    .sort({ startDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Reservation.countDocuments(query);

  sendSuccess(res, {
    reservations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Reservations retrieved successfully');
});

const getSellerReservations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const products = await Product.find({ seller: req.user.id }).select('_id');
  const productIds = products.map(p => p._id);

  const query = { product: { $in: productIds } };
  if (status) query.status = status;

  const reservations = await Reservation.find(query)
    .populate('product', 'name images')
    .populate('user', 'firstName lastName email phone')
    .sort({ startDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Reservation.countDocuments(query);

  sendSuccess(res, {
    reservations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Seller reservations retrieved successfully');
});

const updateReservationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }

  // Vérifier les permissions
  const product = await Product.findById(reservation.product);
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  if (status === 'confirmed' && reservation.status === 'pending') {
    // Réduire le stock
    product.stock -= reservation.quantity;
    await product.save();
  }

  reservation.status = status;
  await reservation.save();

  // Notifier le client en temps réel (déjà existant)...
  SocketService.sendToUser(reservation.user.toString(), 'reservation-update', {
    reservationId: reservation._id,
    status: reservation.status,
  });

  // ...ET persister une vraie notification (même correctif qu'à la
  // création : sans ça, un client absent au moment exact du changement de
  // statut ne le voyait jamais nulle part ensuite).
  try {
    const statusLabels = { confirmed: 'confirmée ✅', cancelled: 'annulée ❌', completed: 'terminée 🎉', pending: 'en attente' };
    await NotificationService.send({
      userId: reservation.user,
      type: 'reservation_created',
      title: `📅 Réservation ${statusLabels[status] || status}`,
      message: `Votre réservation pour ${product.name} est désormais ${statusLabels[status] || status}.`,
      data: { reservationId: reservation._id, link: '../html/client.html?section=reservations' },
      priority: 'high',
      channels: ['in_app', 'push'],
      eventId: reservation._id,
      eventModel: 'Reservation',
    });
  } catch (notifError) {
    console.error('Error notifying client of reservation status change:', notifError);
  }

  sendSuccess(res, reservation, 'Reservation status updated successfully');
});

const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }

  if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  if (reservation.status === 'completed' || reservation.status === 'cancelled') {
    throw new BadRequestError('Reservation cannot be cancelled');
  }

  if (reservation.status === 'confirmed') {
    const product = await Product.findById(reservation.product);
    if (product) {
      product.stock += reservation.quantity;
      await product.save();
    }
  }

  reservation.status = 'cancelled';
  await reservation.save();

  sendSuccess(res, reservation, 'Reservation cancelled successfully');
});

const getReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id)
    .populate('product', 'name images price weight')
    .populate('user', 'firstName lastName email phone');

  if (!reservation) {
    throw new NotFoundError('Reservation not found');
  }

  const isOwner = reservation.user._id.toString() === req.user.id;
  if (!isOwner && req.user.role !== 'admin') {
    throw new BadRequestError('Access denied');
  }

  sendSuccess(res, reservation, 'Reservation retrieved successfully');
});

module.exports = {
  createReservation,
  getReservations,
  getReservation,
  getSellerReservations,
  updateReservationStatus,
  cancelReservation,
};
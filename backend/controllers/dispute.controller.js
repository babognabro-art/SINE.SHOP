const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');

// POST /api/disputes — le client ou le vendeur d'une commande peut ouvrir un
// litige à son sujet. On détermine automatiquement "against" (l'autre
// partie) à partir de la commande, pour éviter qu'un utilisateur désigne
// n'importe qui.
const createDispute = asyncHandler(async (req, res) => {
  const { orderId, reason, description } = req.body;

  if (!orderId || !reason || !description) {
    throw new BadRequestError('orderId, reason and description are required');
  }
  if (!['not_received', 'not_as_described', 'damaged', 'refund_request', 'other'].includes(reason)) {
    throw new BadRequestError('Invalid reason');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const userId = req.user.id;
  const isBuyer = order.user && order.user.toString() === userId;
  const isSeller = order.seller && order.seller.toString() === userId;
  if (!isBuyer && !isSeller) {
    throw new BadRequestError('You are not part of this order');
  }

  const against = isBuyer ? order.seller : order.user;
  if (!against) {
    throw new BadRequestError('The other party on this order could not be determined');
  }

  const dispute = await Dispute.create({
    order: orderId,
    raisedBy: userId,
    against,
    reason,
    description,
  });

  sendCreated(res, dispute, 'Dispute submitted');
});

// GET /api/disputes/me — les litiges où l'utilisateur connecté est impliqué,
// qu'il les ait ouverts ou qu'ils le concernent.
const getMyDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({
    $or: [{ raisedBy: req.user.id }, { against: req.user.id }],
  })
    .populate('order', 'total status createdAt')
    .populate('raisedBy', 'firstName lastName')
    .populate('against', 'firstName lastName')
    .sort({ createdAt: -1 });

  sendSuccess(res, disputes, 'Disputes retrieved');
});

// GET /api/disputes — réservé au staff (moderator/admin/superadmin).
const getAllDisputes = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const disputes = await Dispute.find(filter)
    .populate('order', 'total status createdAt')
    .populate('raisedBy', 'firstName lastName email')
    .populate('against', 'firstName lastName email')
    .sort({ createdAt: -1 });

  sendSuccess(res, disputes, 'Disputes retrieved');
});

// PUT /api/disputes/:id/resolve — réservé au staff.
const resolveDispute = asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;
  if (!['resolved', 'rejected'].includes(status)) {
    throw new BadRequestError('Status must be "resolved" or "rejected"');
  }

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  dispute.status = status;
  dispute.resolution = resolution || '';
  dispute.resolvedBy = req.user.id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  sendSuccess(res, dispute, 'Dispute updated');
});

module.exports = {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute,
};

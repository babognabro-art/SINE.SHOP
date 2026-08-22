const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    pendingOrders,
    recentOrders,
    userStats,
    orderStats,
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ status: 'pending' }),
    Order.find().sort({ createdAt: -1 }).limit(10)
      .populate('user', 'firstName lastName'),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
  ]);

  const stats = {
    users: {
      total: totalUsers,
      byRole: userStats,
    },
    products: totalProducts,
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      byStatus: orderStats,
    },
    revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
    recentOrders,
  };

  sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;

  const query = {};
  if (role) query.role = role;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  sendSuccess(res, {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Users retrieved successfully');
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!['active', 'suspended', 'pending'].includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  user.status = status;
  await user.save();

  sendSuccess(res, user, 'User status updated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Ne pas supprimer les admins
  if (user.role === 'admin' || user.role === 'superadmin') {
    throw new BadRequestError('Cannot delete admin users');
  }

  await user.deleteOne();

  sendSuccess(res, null, 'User deleted successfully');
});

const getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalPayments,
    totalRevenue,
    todayOrders,
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Payment.countDocuments(),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }),
  ]);

  const stats = {
    totalUsers,
    totalProducts,
    totalOrders,
    totalPayments,
    totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
    todayOrders,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, stats, 'System statistics retrieved successfully');
});

// GET /api/admin/orders — jusqu'ici, aucune route ne permettait à un admin
// de voir toutes les commandes de la plateforme (getOrders filtre toujours
// sur l'utilisateur connecté, inutilisable pour une vue d'ensemble admin).
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, status } = req.query;
  const query = {};
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate('user', 'firstName lastName email')
    .populate('seller', 'firstName lastName storeName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  sendSuccess(res, { orders, total }, 'Orders retrieved successfully');
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getSystemStats,
  getAllOrdersAdmin,
};
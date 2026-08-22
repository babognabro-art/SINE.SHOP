const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const { sendSuccess } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    user,
    orders,
    payments,
    stats,
  ] = await Promise.all([
    User.findById(userId).select('-password -refreshToken'),
    Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
    Payment.find({ user: userId }).sort({ createdAt: -1 }).limit(5),
    Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' }
      } }
    ]),
  ]);

  const dashboard = {
    user,
    recentOrders: orders,
    recentPayments: payments,
    stats: {
      totalOrders: orders.length,
      totalSpent: stats.reduce((sum, s) => sum + s.total, 0),
      orderStats: stats,
    },
  };

  sendSuccess(res, dashboard, 'Dashboard retrieved successfully');
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    pendingOrders,
    recentOrders,
    monthlyRevenue,
    topProducts,
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
      .populate('user', 'firstName lastName')
      .populate('items.product', 'name'),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setDate(1)) },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$total' }
        }
      }
    ]),
    Product.aggregate([
      { $sort: { sales: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: 'seller', foreignField: '_id', as: 'seller' } },
    ]),
  ]);

  const dashboard = {
    overview: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      pendingOrders,
    },
    recentOrders,
    monthlyRevenue,
    topProducts,
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, dashboard, 'Admin dashboard retrieved successfully');
});

const getSellerDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.user.id;

  const [
    products,
    orders,
    stats,
    recentOrders,
  ] = await Promise.all([
    Product.find({ seller: sellerId }).countDocuments(),
    Order.find({ seller: sellerId }).countDocuments(),
    Order.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' }
      } }
    ]),
    Order.find({ seller: sellerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName'),
  ]);

  const totalRevenue = stats.reduce((sum, s) => sum + s.total, 0);

  const dashboard = {
    products,
    orders,
    totalRevenue,
    stats,
    recentOrders,
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, dashboard, 'Seller dashboard retrieved successfully');
});

const getLivreurDashboard = asyncHandler(async (req, res) => {
  const livreurId = req.user.id;

  const [
    deliveries,
    stats,
    recentDeliveries,
  ] = await Promise.all([
    Order.find({ livreur: livreurId }).countDocuments(),
    Order.aggregate([
      { $match: { livreur: new mongoose.Types.ObjectId(livreurId) } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' }
      } }
    ]),
    Order.find({ livreur: livreurId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName address'),
  ]);

  const totalDelivered = stats.filter(s => s._id === 'delivered')
    .reduce((sum, s) => sum + s.count, 0);

  const dashboard = {
    deliveries,
    totalDelivered,
    stats,
    recentDeliveries,
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, dashboard, 'Livreur dashboard retrieved successfully');
});

module.exports = {
  getDashboard,
  getAdminDashboard,
  getSellerDashboard,
  getLivreurDashboard,
};
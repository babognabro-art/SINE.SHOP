const Notification = require('../models/Notification');
const { sendSuccess, sendCreated } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/ApiError');
const SocketService = require('../services/socket.service');

const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isRead } = req.query;

  const query = { user: req.user.id };
  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });

  sendSuccess(res, {
    notifications,
    unreadCount,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Notifications retrieved successfully');
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.user.toString() !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  sendSuccess(res, notification, 'Notification marked as read');
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  sendSuccess(res, null, 'All notifications marked as read');
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  if (notification.user.toString() !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  await notification.deleteOne();

  sendSuccess(res, null, 'Notification deleted successfully');
});

const createNotification = asyncHandler(async (req, res) => {
  const { userId, type, title, message, data, link, priority } = req.body;

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    data: data || {},
    link: link || null,
    priority: priority || 'medium',
  });

  // Envoyer la notification en temps réel
  SocketService.sendToUser(userId, 'new-notification', notification);

  sendCreated(res, notification, 'Notification created successfully');
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
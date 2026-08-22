const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'welcome',
      'verification',
      'password_reset',
      'order_created',
      'order_confirmed',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'payment_success',
      'payment_failed',
      'cart_reminder',
      'price_drop',
      'promotion',
      'new_product',
      'review',
      'message',
      'delivery_update',
      'reservation',
      'reservation_created',
      'affiliate',
      'system',
      'fraud_alert',
      'security',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    default: 'in_app',
  },
  // Lien de destination — permet à la notification d'ouvrir directement la
  // bonne section (ex: client.html?section=commandes) au clic, au lieu de
  // rediriger vers une page générique. N'existait pas du tout jusqu'ici.
  link: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read', 'delivered'],
    default: 'pending',
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  deliveredAt: Date,
  sentAt: Date,
  error: String,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  // Pour les emails
  emailSent: {
    type: Boolean,
    default: false,
  },
  emailError: String,
  // Pour les SMS
  smsSent: {
    type: Boolean,
    default: false,
  },
  smsError: String,
  // Pour les push
  pushSent: {
    type: Boolean,
    default: false,
  },
  pushError: String,
  // Pour les in-app
  inAppSent: {
    type: Boolean,
    default: false,
  },
  // Métadonnées de l'événement
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'eventModel',
  },
  eventModel: {
    type: String,
    enum: ['Order', 'Payment', 'Product', 'User', 'Reservation'],
  },
  // Métriques
  openRate: {
    type: Number,
    default: 0,
  },
  clickRate: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });

// Méthode pour marquer comme lue
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Méthode pour marquer comme envoyée
notificationSchema.methods.markAsSent = function(channel) {
  this.status = 'sent';
  this.sentAt = new Date();
  if (channel) {
    this[`${channel}Sent`] = true;
  }
  return this.save();
};

// Méthode pour marquer comme échouée
notificationSchema.methods.markAsFailed = function(channel, error) {
  this.status = 'failed';
  if (channel) {
    this[`${channel}Error`] = error;
  } else {
    this.error = error;
  }
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
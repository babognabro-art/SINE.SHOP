const { getIO, emitToUser, emitToRoom, emitToAll, isSocketEnabled } = require('../config/socket');

class SocketService {
  static isEnabled() {
    return isSocketEnabled();
  }

  static sendToUser(userId, event, payload) {
    return emitToUser(userId, event, payload);
  }

  static sendToRoom(room, event, payload) {
    return emitToRoom(room, event, payload);
  }

  static sendToAll(event, payload) {
    return emitToAll(event, payload);
  }

  static getIO() {
    return getIO();
  }

  static notifyOrderUpdate(userId, order) {
    this.sendToUser(userId, 'order-updated', {
      orderId: order._id,
      status: order.status,
      timestamp: new Date().toISOString(),
    });
  }

  static notifyNewMessage(userId, message) {
    this.sendToUser(userId, 'new-message', {
      messageId: message._id,
      sender: message.sender,
      content: message.content,
      timestamp: message.createdAt,
    });
  }

  static notifyDeliveryUpdate(userId, order, livreur) {
    this.sendToUser(userId, 'delivery-update', {
      orderId: order._id,
      status: order.status,
      livreur: {
        id: livreur._id,
        name: `${livreur.firstName} ${livreur.lastName}`,
        location: livreur.location,
      },
      timestamp: new Date().toISOString(),
    });
  }

  static notifyPaymentSuccess(userId, payment) {
    this.sendToUser(userId, 'payment-success', {
      paymentId: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      timestamp: payment.createdAt,
    });
  }
}

module.exports = SocketService;
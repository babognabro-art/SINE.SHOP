const Order = require('../models/Order');

module.exports = (io, socket) => {
  // Rejoindre la room client
  socket.on('join_client_room', () => {
    if (socket.user.role !== 'client') {
      socket.emit('error', { message: 'Rôle non autorisé' });
      return;
    }
    socket.join(`client:${socket.user._id}`);
    socket.emit('joined_client_room');
  });

  // Demander le suivi d'une commande
  socket.on('track_order', async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('client')
        .populate('seller')
        .populate('delivery.livreur');
      if (!order) {
        socket.emit('error', { message: 'Commande introuvable' });
        return;
      }
      // Vérifier que le client est bien le propriétaire
      if (order.client.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Accès non autorisé' });
        return;
      }
      // Envoyer les infos de suivi
      socket.emit('order_tracking', order);
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur suivi commande' });
    }
  });

  // Confirmation de réception (livraison)
  socket.on('confirm_delivery', async (orderId) => {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        socket.emit('error', { message: 'Commande introuvable' });
        return;
      }
      if (order.client.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Accès non autorisé' });
        return;
      }
      if (order.status !== 'delivered') {
        socket.emit('error', { message: 'La commande n\'est pas encore livrée' });
        return;
      }
      // Confirmer la réception (peut déclencher un paiement au vendeur, etc.)
      // Logique métier supplémentaire...
      io.to(`seller:${order.seller.user}`).emit('delivery_confirmed', orderId);
      socket.emit('delivery_confirmed', orderId);
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur confirmation' });
    }
  });
};
const Order = require('../models/Order');

module.exports = (io, socket) => {
  // Rejoindre la room du vendeur (pour recevoir les commandes)
  socket.on('join_seller_room', async () => {
    if (socket.user.role !== 'seller') {
      socket.emit('error', { message: 'Rôle non autorisé' });
      return;
    }
    // On peut utiliser une room spécifique au vendeur basée sur son ID
    socket.join(`seller:${socket.user._id}`);
    socket.emit('joined_seller_room');
  });

  // Écouter les mises à jour de commandes (émanant du vendeur)
  socket.on('update_order_status', async (data) => {
    try {
      const { orderId, status } = data;
      const order = await Order.findById(orderId)
        .populate('client')
        .populate('seller');
      if (!order) {
        socket.emit('error', { message: 'Commande non trouvée' });
        return;
      }
      // Vérifier que le vendeur est bien le propriétaire
      if (order.seller.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Action non autorisée' });
        return;
      }
      order.status = status;
      await order.save();

      // Notifier le client et le livreur concernés
      io.to(`user:${order.client.user._id}`).emit('order_updated', order);
      if (order.delivery?.livreur) {
        io.to(`user:${order.delivery.livreur.user}`).emit('order_updated', order);
      }
      // Notifier également tous les vendeurs ? Non, seulement ce vendeur
      io.to(`seller:${socket.user._id}`).emit('order_status_changed', order);
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur mise à jour commande' });
    }
  });
};
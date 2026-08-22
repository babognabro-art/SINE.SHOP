const Livreur = require('../models/Livreur');
const Order = require('../models/Order');

module.exports = (io, socket) => {
  // Le livreur met à jour sa position
  socket.on('update_delivery_location', async (data) => {
    try {
      const { orderId, lat, lng } = data;
      // Vérifier que l'utilisateur est bien le livreur assigné
      const order = await Order.findById(orderId).populate('delivery.livreur');
      if (!order || order.delivery.livreur.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Accès non autorisé' });
        return;
      }
      // Mettre à jour la position du livreur (déjà dans la base)
      const livreur = await Livreur.findOne({ user: socket.user._id });
      if (livreur) {
        livreur.currentLocation.coordinates = [lng, lat];
        await livreur.save();
      }

      // Émettre la nouvelle position au client et au vendeur
      io.to(`order:${orderId}`).emit('delivery_location', { orderId, lat, lng });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur mise à jour position' });
    }
  });

  // Le livreur change le statut de livraison (ex: en route, livré)
  socket.on('update_delivery_status', async (data) => {
    try {
      const { orderId, status } = data; // status: 'shipped', 'in_transit', 'delivered'
      const order = await Order.findById(orderId).populate('delivery.livreur');
      if (!order || order.delivery.livreur.user.toString() !== socket.user._id.toString()) {
        socket.emit('error', { message: 'Accès non autorisé' });
        return;
      }
      order.status = status;
      if (status === 'delivered') {
        order.delivery.actualDelivery = new Date();
      }
      await order.save();

      // Notifier le client et le vendeur
      io.to(`order:${orderId}`).emit('delivery_status_updated', { orderId, status });
      io.to(`client:${order.client.user}`).emit('delivery_status_updated', { orderId, status });
      io.to(`seller:${order.seller.user}`).emit('delivery_status_updated', { orderId, status });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur mise à jour statut' });
    }
  });
};
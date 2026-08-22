const Order = require('../models/Order');

module.exports = (io, socket) => {
  // Un utilisateur peut s'abonner aux mises à jour d'une commande spécifique
  socket.on('subscribe_order', (orderId) => {
    // On peut créer une room par commande
    socket.join(`order:${orderId}`);
    socket.emit('subscribed_order', orderId);
  });

  // Se désabonner
  socket.on('unsubscribe_order', (orderId) => {
    socket.leave(`order:${orderId}`);
    socket.emit('unsubscribed_order', orderId);
  });

  // Annulation de commande par le client (déjà gérée dans le contrôleur, mais on peut émettre)
  // On peut aussi ajouter un événement pour annuler via socket
};
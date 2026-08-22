const Reservation = require('../models/Reservation');

module.exports = (io, socket) => {
  // S'abonner aux réservations d'un produit
  socket.on('subscribe_product_reservations', (productId) => {
    socket.join(`reservations:${productId}`);
  });

  // Lorsqu'une réservation est créée ou annulée, on émet à la room du produit
  // Cette fonction est appelée depuis le contrôleur
  // On peut exporter une fonction utilitaire
};

// Fonction utilitaire pour émettre une mise à jour de réservation
const emitReservationUpdate = (io, productId, reservation) => {
  io.to(`reservations:${productId}`).emit('reservation_updated', reservation);
};

module.exports.emitReservationUpdate = emitReservationUpdate;
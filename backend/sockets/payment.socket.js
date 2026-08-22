const Payment = require('../models/Payment');

module.exports = (io, socket) => {
  // S'abonner au statut d'un paiement
  socket.on('subscribe_payment', (paymentId) => {
    socket.join(`payment:${paymentId}`);
  });

  // Le webhook Stripe ou le contrôleur peut émettre des mises à jour
  // Exemple : io.to(`payment:${paymentId}`).emit('payment_status', { status: 'succeeded' })
};
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  // Un client peut demander ses notifications non lues
  socket.on('get_unread_notifications', async () => {
    try {
      const notifications = await Notification.find({
        recipient: socket.user._id,
        isRead: false,
      }).sort({ createdAt: -1 });
      socket.emit('unread_notifications', notifications);
    } catch (err) {
      console.error(err);
    }
  });

  // Marquer toutes les notifications comme lues
  socket.on('mark_all_notifications_read', async () => {
    try {
      await Notification.updateMany(
        { recipient: socket.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      socket.emit('notifications_marked_read');
    } catch (err) {
      console.error(err);
    }
  });

  // Émettre une nouvelle notification (appelé depuis les contrôleurs)
  // On utilise io.to(`user:${userId}`).emit('new_notification', notification)
  // Cette fonction n'est pas un événement client, mais une méthode utilitaire
  // On peut exporter une fonction pour émettre depuis l'extérieur
};

// Fonction utilitaire pour envoyer une notification à un utilisateur spécifique
const emitNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('new_notification', notification);
};

// On peut également exporter pour l'utiliser dans d'autres fichiers
module.exports.emitNotification = emitNotification;
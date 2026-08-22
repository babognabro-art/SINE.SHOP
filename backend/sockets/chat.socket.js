const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

module.exports = (io, socket) => {
  // Rejoindre une conversation (room)
  socket.on('join_conversation', async (conversationId) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation non trouvée' });
        return;
      }
      // Vérifier que l'utilisateur participe à la conversation
      if (!conversation.participants.some(p => p.toString() === socket.user._id.toString())) {
        socket.emit('error', { message: 'Accès non autorisé à cette conversation' });
        return;
      }
      socket.join(conversationId);
      socket.emit('joined_conversation', conversationId);
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur lors de la jointure' });
    }
  });

  // Quitter une conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    socket.emit('left_conversation', conversationId);
  });

  // Envoyer un message
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, attachments = [] } = data;
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation inexistante' });
        return;
      }

      // Créer le message en base
      const message = new Message({
        conversation: conversationId,
        sender: socket.user._id,
        content,
        attachments,
      });
      await message.save();

      // Mettre à jour le dernier message de la conversation
      conversation.lastMessage = message._id;
      await conversation.save();

      // Peupler le message pour l'envoyer
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'firstName lastName profilePicture');

      // Émettre le message à tous les participants de la conversation
      io.to(conversationId).emit('receive_message', populatedMessage);

      // Notifier les destinataires individuellement (optionnel)
      // On peut également envoyer une notification push via le service de notification

    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Marquer un message comme lu
  socket.on('mark_message_read', async (messageId) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await Conversation.findById(message.conversation);
      if (!conversation.participants.some(p => p.toString() === socket.user._id.toString())) {
        return;
      }
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
      // Informer les autres participants que le message est lu
      io.to(message.conversation.toString()).emit('message_read', { messageId, userId: socket.user._id });
    } catch (err) {
      console.error(err);
    }
  });

  // Indicateur de saisie (typing)
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(conversationId).emit('user_typing', {
      userId: socket.user._id,
      isTyping,
    });
  });
};
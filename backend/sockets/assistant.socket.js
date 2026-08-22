const { chat } = require('../services/ai.service');

module.exports = (io, socket) => {
  socket.on('assistant_message', async (data) => {
    try {
      const { message, context } = data;
      // Appeler le service IA
      const response = await chat(message, context);
      // Émettre la réponse uniquement à ce socket
      socket.emit('assistant_response', {
        query: message,
        response: response.text,
        intent: response.intent,
      });
      // Optionnellement, enregistrer dans l'historique (déjà fait dans le contrôleur)
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Erreur avec l\'assistant' });
    }
  });
};
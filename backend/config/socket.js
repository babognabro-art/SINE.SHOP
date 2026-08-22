const socketIO = require('socket.io');
// Le vrai système d'événements temps réel (chat, appels vocaux/vidéo WebRTC,
// localisation en direct, présence) vit dans ../sockets/index.js — il n'était
// jusqu'ici jamais branché : server.js n'utilisait que ce fichier-ci, qui
// faisait confiance à un simple événement "authenticate" envoyé par le
// client sans jamais vérifier son token JWT (n'importe qui aurait pu se
// faire passer pour n'importe quel utilisateur). Corrigé en délégant
// l'authentification et les événements à sockets/index.js, qui vérifie
// réellement le token à la connexion.
const registerSocketHandlers = require('../sockets');

let io = null;
let socketEnabled = false;

const initializeSocket = (server) => {
  try {
    io = socketIO(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    registerSocketHandlers(io);

    socketEnabled = true;
    console.log('✅ Socket.io initialized successfully');
    return io;
  } catch (error) {
    console.log('⚠️  Socket.io initialization error:', error.message);
    socketEnabled = false;
    return null;
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Chaque socket authentifié rejoint automatiquement la room `user_<id>`
// (voir sockets/index.js) — ces trois fonctions restent donc compatibles
// avec tout le code existant (message.controller.js, notification.service.js,
// order.controller.js, etc.) sans aucun changement de leur côté.
const emitToUser = (userId, event, payload) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, payload);
  }
};

const emitToRoom = (room, event, payload) => {
  if (io) {
    io.to(room).emit(event, payload);
  }
};

const emitToAll = (event, payload) => {
  if (io) {
    io.emit(event, payload);
  }
};

// Fonction (pas une valeur figée) pour que l'état reflète toujours la
// réalité, même lue longtemps après le require() du module.
const isSocketEnabled = () => socketEnabled;

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRoom,
  emitToAll,
  isSocketEnabled,
  // Rétrocompatibilité : certains fichiers importaient socketEnabled comme
  // valeur directe — conservé, mais isSocketEnabled() est la source fiable.
  get socketEnabled() { return socketEnabled; },
};

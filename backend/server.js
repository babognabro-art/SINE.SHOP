const app = require('./app');
const http = require('http');
const { initializeSocket } = require('./config/socket');
const SchedulerService = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialiser Socket.io
const io = initializeSocket(server);
app.set('io', io);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 SINE.SHOP BACKEND                                   ║
║   📡 Port: ${PORT}                                         ║
║   🔗 http://localhost:${PORT}                              ║
║   📝 Mode: ${process.env.NODE_ENV || 'development'}         ║
║   📦 Version: 1.0.0                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  SchedulerService.start();
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Arrêt gracieux
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  SchedulerService.stop();
  server.close(() => {
    console.log('💀 Process terminated!');
  });
});
// Middleware réservant une route aux comptes admin/superadmin/moderator.
// Bug corrigé : ce fichier référençait "authenticateToken" (inexistant dans
// auth.middleware.js, qui exporte "protect") et "sellerMiddleware" (jamais
// défini) — ce qui aurait fait planter le serveur au démarrage dès qu'un
// routeur l'important (collection.routes.js, stats.routes.js) aurait été
// monté. On exporte maintenant directement un tableau de middlewares
// [protect, checkIsAdmin], utilisable tel quel : router.get('/x', adminMiddleware, ...)
const { protect } = require('./auth.middleware');

const checkIsAdmin = (req, res, next) => {
  const role = req.user && req.user.role;
  if (!['admin', 'superadmin', 'moderator'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs.',
    });
  }
  next();
};

module.exports = [protect, checkIsAdmin];

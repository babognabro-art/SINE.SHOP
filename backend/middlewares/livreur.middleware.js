const { authenticateToken } = require('./auth.middleware');

const livreurMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'livreur') {
        return res.status(403).json({
            message: 'Accès réservé aux livreurs.'
        });
    }

    next();
};

module.exports = [
    authenticateToken,
    livreurMiddleware
];
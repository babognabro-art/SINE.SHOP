const { authenticateToken } = require('./auth.middleware');

const sellerMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({
            message: 'Accès réservé aux vendeurs.'
        });
    }

    next();
};

module.exports = [
    authenticateToken,
    sellerMiddleware
];
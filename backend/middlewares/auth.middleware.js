const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const { ApiError, UnauthorizedError, ForbiddenError } = require('../utils/ApiError');

const protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier l'en-tête Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier le cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Vérifier le paramètre de requête
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedError('Not authorized, no token');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedError('Not authorized, invalid token');
    }

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      throw new UnauthorizedError('Not authorized, user not found');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Account suspended');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authorized'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Access denied: insufficient permissions'));
    }
    
    next();
  };
};

const isClient = (req, res, next) => {
  if (!req.user || req.user.role !== 'client') {
    return next(new ForbiddenError('Access denied: client only'));
  }
  next();
};

const isSeller = (req, res, next) => {
  if (!req.user || !['seller', 'admin', 'superadmin'].includes(req.user.role)) {
    return next(new ForbiddenError('Access denied: seller only'));
  }
  next();
};

const isLivreur = (req, res, next) => {
  if (!req.user || !['livreur', 'admin', 'superadmin'].includes(req.user.role)) {
    return next(new ForbiddenError('Access denied: livreur only'));
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return next(new ForbiddenError('Access denied: admin only'));
  }
  next();
};

const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return next(new ForbiddenError('Access denied: superadmin only'));
  }
  next();
};

const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      if (!resource) {
        return next(new ApiError(404, 'Resource not found'));
      }
      
      const userId = resource.user ? resource.user.toString() : resource._id.toString();
      if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return next(new ForbiddenError('Access denied: not the owner'));
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

const verifyOwnership = (model, field = 'user') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      if (!resource) {
        return next(new ApiError(404, 'Resource not found'));
      }
      
      if (resource[field] && resource[field].toString() !== req.user.id) {
        return next(new ForbiddenError('Access denied: not the owner'));
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  protect,
  authorize,
  isClient,
  isSeller,
  isLivreur,
  isAdmin,
  isSuperAdmin,
  checkOwnership,
  verifyOwnership,
};
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes par fenêtre
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10000, // plafond très élevé pour l'API publique ; les requêtes réussies ne consomment pas la limite
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 200, // 200 requêtes par fenêtre
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // 50 requêtes par fenêtre
  message: {
    success: false,
    message: 'Too many admin requests, please try again later',
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requêtes par fenêtre
  message: {
    success: false,
    message: 'Too many attempts, please try again later',
    errors: ['Rate limit exceeded'],
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  adminLimiter,
  sensitiveLimiter,
};
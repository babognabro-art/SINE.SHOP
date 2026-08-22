const { ApiError } = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Erreur API personnalisée
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      timestamp: err.timestamp || new Date().toISOString(),
    });
  }

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages,
      timestamp: new Date().toISOString(),
    });
  }

  // Erreur de duplication MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      errors: [`${field} must be unique`],
      timestamp: new Date().toISOString(),
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      errors: [err.message],
      timestamp: new Date().toISOString(),
    });
  }

  // Erreur de cast MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errors: [`Invalid ${err.path}: ${err.value}`],
      timestamp: new Date().toISOString(),
    });
  }

  // Erreur de multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      errors: ['File size exceeds limit'],
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file',
      errors: ['Too many files uploaded'],
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files for this field',
      errors: ['File count exceeds the allowed limit'],
      timestamp: new Date().toISOString(),
    });
  }

  // Erreur par défaut
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  console.error('💥 Unhandled error:', err.stack);
  
  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: ['Endpoint does not exist'],
    timestamp: new Date().toISOString(),
  });
};

const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncErrorHandler,
};
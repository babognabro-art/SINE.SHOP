const { validationResult } = require('express-validator');
const { ApiError, ValidationError } = require('../utils/ApiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    throw new ValidationError('Validation error', errorMessages);
  }
  next();
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ValidationError('Validation error', errors);
    }
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ValidationError('Invalid query parameters', errors);
    }
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => detail.message);
      throw new ValidationError('Invalid parameters', errors);
    }
    next();
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
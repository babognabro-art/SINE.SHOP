class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      errors: this.errors,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

const createError = (statusCode, message, errors = []) => {
  return new ApiError(statusCode, message, errors);
};

class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors = []) {
    super(400, message, errors);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', errors = []) {
    super(401, message, errors);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', errors = []) {
    super(403, message, errors);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', errors = []) {
    super(404, message, errors);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', errors = []) {
    super(409, message, errors);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(422, message, errors);
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', errors = []) {
    super(500, message, errors);
  }
}

module.exports = {
  ApiError,
  createError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
};

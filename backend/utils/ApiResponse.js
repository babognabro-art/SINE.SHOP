class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

const sendResponse = (res, statusCode, data, message = 'Success') => {
  const response = new ApiResponse(statusCode, data, message);
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, data, message = 'Success') => {
  return sendResponse(res, 200, data, message);
};

const sendCreated = (res, data, message = 'Created successfully') => {
  return sendResponse(res, 201, data, message);
};

const sendError = (res, statusCode, message = 'Error', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

// favorite.controller.js et review.controller.js appellent ApiResponse.success(data, message)
// et ApiResponse.error(message, statusCode) en attendant un objet en retour (pas un envoi direct) —
// ces deux méthodes n'existaient nulle part, ce qui faisait planter toutes leurs routes.
const success = (data, message = 'Success') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

const error = (message = 'Error', statusCode = 400) => ({
  success: false,
  message,
  statusCode,
  timestamp: new Date().toISOString(),
});

module.exports = {
  ApiResponse,
  sendResponse,
  sendSuccess,
  sendCreated,
  sendError,
  success,
  error,
};
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`Async Handler Error: ${error.message}`);
      next(error);
    });
  };
};

// Version avec try/catch
const tryCatch = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { asyncHandler, tryCatch };
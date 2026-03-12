// ========================================
// ASYNC ERROR HANDLER
// Wraps async functions to catch errors
// ========================================

/**
 * Wraps an async function to catch errors and pass to Express error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
/**
 * Utility functions for handling errors in API routes
 */

/**
 * Handles API errors consistently across the application
 * @param {Object} res - Express response object
 * @param {Error} error - The error that occurred
 * @param {string} message - Optional custom message
 */
function handleApiError(res, error, message = 'An error occurred') {
  const statusCode = error.statusCode || 500;
  
  // Log the error (but not in tests)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`API Error (${statusCode}): ${message}`, error);
  }
  
  // Send appropriate response to client
  res.status(statusCode).json({
    error: message,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

module.exports = {
  handleApiError
};
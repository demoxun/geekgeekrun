export function centralErrorHandler(err, req, res, next) {
  console.error(`[Central Error Handler] Caught Error: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Customize messages or codes for specific error types if needed
  if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = 400;
    message = 'Invalid JSON payload.';
  }
  // Add more specific error type handling here, e.g., for validation errors from a library

  // Ensure status code is a valid HTTP error code
  if (statusCode < 400) {
    statusCode = 500;
  }

  res.status(statusCode).json({
    error: {
      message: message,
      type: err.name || 'Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack in dev
      ...(err.details && {details: err.details}) // Include custom details if any
    }
  });
}

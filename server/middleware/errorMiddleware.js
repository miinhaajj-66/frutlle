const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : (err.status || err.statusCode || 500);
  let message = err.message || 'Internal Server Error';

  // Handle network / downstream connection failures
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Downstream service unavailable. Please check database connectivity.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token failed or expired';
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Structured diagnostic log for 5xx server errors
  if (statusCode >= 500) {
    console.error(`[ERROR] [${req.method} ${req.originalUrl}] Status: ${statusCode} - ${err.message}`);
    if (err.stack && process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

export { notFound, errorHandler };

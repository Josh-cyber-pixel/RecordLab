// src/middleware/errorHandler.js
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Internal server error';

  // Prisma known errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with that value already exists.';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found.';
  }

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message    = err.message;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;

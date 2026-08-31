// src/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFoundError     = (msg = 'Resource not found.') => new AppError(msg, 404);
const unauthorizedError = (msg = 'Unauthorized.')        => new AppError(msg, 401);
const forbiddenError    = (msg = 'Forbidden.')           => new AppError(msg, 403);
const badRequestError   = (msg = 'Bad request.')         => new AppError(msg, 400);
const conflictError     = (msg = 'Conflict.')            => new AppError(msg, 409);
const validationError   = (msg = 'Validation failed.')   => new AppError(msg, 422);

module.exports = {
  AppError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  badRequestError,
  conflictError,
  validationError,
};

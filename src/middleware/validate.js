// src/middleware/validate.js
const { validationResult } = require('express-validator');
const { validationError } = require('../utils/errors');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return next(validationError(messages.join('; ')));
  }
  next();
};

module.exports = validate;

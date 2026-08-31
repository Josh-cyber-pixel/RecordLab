// src/utils/token.js
const jwt = require('jsonwebtoken');
const env  = require('../config/env');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, schoolId: user.schoolId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

module.exports = { signToken };

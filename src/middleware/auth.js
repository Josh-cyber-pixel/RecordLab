// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const env  = require('../config/env');
const prisma = require('../config/prisma');
const { unauthorizedError, forbiddenError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorizedError('No token provided.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, role: true, status: true,
        firstName: true, lastName: true, email: true, schoolId: true,
      },
    });

    if (!user) return next(unauthorizedError('User no longer exists.'));
    if (user.status !== 'ACTIVE') return next(unauthorizedError('Account is inactive or suspended.'));

    req.user = user;
    req.schoolId = user.schoolId;
    next();
  } catch (err) {
    return next(unauthorizedError('Invalid or expired token.'));
  }
};

const protect = (...roles) => (req, res, next) => {
  if (!req.user) return next(unauthorizedError('Not authenticated.'));
  if (!roles.includes(req.user.role)) {
    return next(forbiddenError('You do not have permission to perform this action.'));
  }
  next();
};

module.exports = { authenticate, protect };

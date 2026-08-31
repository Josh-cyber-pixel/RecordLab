// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { unauthorizedError } = require('../../utils/errors');
const { signToken } = require('../../utils/token');

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw unauthorizedError('Invalid email or password.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw unauthorizedError('Invalid email or password.');
  if (user.status !== 'ACTIVE') throw unauthorizedError('Account is inactive or suspended.');

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, role: user.role, schoolId: user.schoolId,
    },
  };
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, schoolId: true },
  });
  return user;
}

module.exports = { login, me };

// src/config/env.js
require('dotenv').config();

const env = {
  NODE_ENV:  process.env.NODE_ENV || 'development',
  PORT:      process.env.PORT || 5001,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET:    process.env.JWT_SECRET || 'dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL:    process.env.CLIENT_URL || 'http://localhost:3000',
  CORS_ORIGINS:  process.env.CORS_ORIGINS || '',
};

if (env.NODE_ENV === 'production' && (!env.JWT_SECRET || env.JWT_SECRET === 'dev_secret_change_me')) {
  throw new Error('JWT_SECRET must be set to a strong random value in production (boot aborted).');
}

module.exports = env;

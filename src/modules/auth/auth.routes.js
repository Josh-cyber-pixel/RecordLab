// src/modules/auth/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

router.post('/login', body('email').isEmail().normalizeEmail(), body('password').notEmpty(), validate, ctrl.login);
router.get('/me', authenticate, ctrl.me);

module.exports = router;

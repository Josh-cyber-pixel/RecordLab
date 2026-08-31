// src/modules/achievements/achievements.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./achievements.controller');
const { authenticate, protect } = require('../../middleware/auth');

const READ_ROLES = ['ADMIN', 'ACCOUNTANT', 'VIEWER'];

router.use(authenticate);

router.get('/', protect(...READ_ROLES), ctrl.getAchievements);

module.exports = router;

// src/modules/finance/finance.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('./finance.controller');
const { authenticate, protect } = require('../../middleware/auth');

const READ_ROLES = ['ADMIN', 'ACCOUNTANT', 'VIEWER'];

router.use(authenticate);

router.get('/summary', protect(...READ_ROLES), ctrl.getFinanceSummary);

module.exports = router;

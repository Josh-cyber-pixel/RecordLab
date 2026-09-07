// src/modules/igf/igf.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./igf.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT'];

router.use(authenticate);

// ── Income (any source: Worship, Canteen, Donations, EGF, etc.) ─────────────
router.get('/income/sources', protect(...READ_ROLES), ctrl.getIncomeSources);
router.get('/income/summary', protect(...READ_ROLES), ctrl.getIncomeSummary);
router.get('/income',         protect(...READ_ROLES), ctrl.listIncome);
router.post('/income', protect(...WRITE_ROLES),
  body('source').notEmpty().withMessage('Income source is required'),
  body('source').isString().withMessage('Source must be text'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  validate, ctrl.createIncome);
router.patch('/income/:id', protect(...WRITE_ROLES), body('amount').optional().isFloat({ min: 0 }), validate, ctrl.updateIncome);
router.delete('/income/:id', protect(...WRITE_ROLES), ctrl.deleteIncome);

module.exports = router;

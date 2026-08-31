// src/modules/igf/igf.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./igf.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT'];
const SOURCES = ['WORSHIP', 'CANTEEN'];

router.use(authenticate);

// ── Income (Worship + Canteen) ─────────────────────────────────────────────
router.get('/income/summary', protect(...READ_ROLES), ctrl.getIncomeSummary);
router.get('/income',         protect(...READ_ROLES), ctrl.listIncome);
router.post('/income', protect(...WRITE_ROLES),
  body('source').isIn(SOURCES).withMessage('Source must be WORSHIP or CANTEEN'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  validate, ctrl.createIncome);
router.patch('/income/:id', protect(...WRITE_ROLES), body('amount').optional().isFloat({ min: 0 }), validate, ctrl.updateIncome);
router.delete('/income/:id', protect(...WRITE_ROLES), ctrl.deleteIncome);

// ── Projects ────────────────────────────────────────────────────────────────
router.get('/projects/summary', protect(...READ_ROLES), ctrl.getProjectsSummary);
router.get('/projects',         protect(...READ_ROLES), ctrl.listProjects);
router.post('/projects', protect(...WRITE_ROLES),
  body('date').isISO8601().withMessage('Valid date required'),
  body('projectType').notEmpty().withMessage('Project type is required'),
  body('benefits').isFloat({ min: 0 }).withMessage('Benefits must be >= 0'),
  validate, ctrl.createProject);
router.patch('/projects/:id', protect(...WRITE_ROLES), body('benefits').optional().isFloat({ min: 0 }), validate, ctrl.updateProject);
router.delete('/projects/:id', protect(...WRITE_ROLES), ctrl.deleteProject);

module.exports = router;

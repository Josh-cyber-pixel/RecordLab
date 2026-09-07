// src/modules/academic/academic.routes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl   = require('./academic.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE = ['ADMIN', 'ACCOUNTANT'];

router.use(authenticate);

router.get('/current-term', protect(...READ), ctrl.getCurrentTerm);
router.get('/years',        protect(...READ), ctrl.listYears);
router.get('/years/:id',    protect(...READ), ctrl.getYear);

router.post('/years', protect(...WRITE),
  body('name').notEmpty().withMessage('Year name is required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  validate, ctrl.createYear);

router.patch('/years/:id', protect(...WRITE),
  body('startDate').optional({ values: 'falsy' }).isISO8601(),
  body('endDate').optional({ values: 'falsy' }).isISO8601(),
  validate, ctrl.updateYear);

router.delete('/years/:id', protect(...WRITE), ctrl.deleteYear);

router.get('/years/:yearId/terms', protect(...READ), ctrl.listTerms);
router.post('/years/:yearId/terms', protect(...WRITE),
  body('name').notEmpty().withMessage('Term name is required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  validate, ctrl.createTerm);

router.get('/terms/:id', protect(...READ), ctrl.getTerm);
router.patch('/terms/:id', protect(...WRITE),
  body('startDate').optional({ values: 'falsy' }).isISO8601(),
  body('endDate').optional({ values: 'falsy' }).isISO8601(),
  validate, ctrl.updateTerm);
router.delete('/terms/:id', protect(...WRITE), ctrl.deleteTerm);

module.exports = router;

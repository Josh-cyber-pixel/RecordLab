// src/modules/ledger/ledger.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./ledger.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT'];
const TYPES = ['PTA', 'PRINTING'];

router.use(authenticate);

router.get('/by-class',  protect(...READ_ROLES), ctrl.listLedgerByClass);
router.get('/summary',   protect(...READ_ROLES), ctrl.getLedgerSummary);
router.get('/',          protect(...READ_ROLES), ctrl.listLedger);
router.get('/:id',       protect(...READ_ROLES), ctrl.getLedgerEntry);

router.post('/', protect(...WRITE_ROLES),
  body('type').isIn(TYPES).withMessage('Type must be PTA or PRINTING'),
  body('classId').notEmpty().withMessage('Class is required'),
  body('studentName').notEmpty().withMessage('Student name is required'),
  body('expectedAmount').optional().isFloat({ min: 0 }),
  body('term1Amount').optional().isFloat({ min: 0 }),
  body('term2Amount').optional().isFloat({ min: 0 }),
  body('term3Amount').optional().isFloat({ min: 0 }),
  validate, ctrl.createLedgerEntry);

router.post('/bulk', protect(...WRITE_ROLES),
  body('type').isIn(TYPES).withMessage('Type must be PTA or PRINTING'),
  body('classId').notEmpty().withMessage('Class is required'),
  body('entries').isArray({ min: 1 }).withMessage('entries array is required'),
  validate, ctrl.bulkUpsertLedger);

router.patch('/:id', protect(...WRITE_ROLES),
  body('expectedAmount').optional().isFloat({ min: 0 }),
  body('term1Amount').optional().isFloat({ min: 0 }),
  body('term2Amount').optional().isFloat({ min: 0 }),
  body('term3Amount').optional().isFloat({ min: 0 }),
  validate, ctrl.updateLedgerEntry);

router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteLedgerEntry);

module.exports = router;

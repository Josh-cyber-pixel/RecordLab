// src/modules/library/library.routes.js
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('./library.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const READ_ROLES  = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const WRITE_ROLES = ['ADMIN', 'ACCOUNTANT'];
const BORROWER_TYPES = ['STUDENT', 'TEACHER'];

router.use(authenticate);

router.get('/summary', protect(...READ_ROLES), ctrl.getLibrarySummary);
router.get('/',        protect(...READ_ROLES), ctrl.listLoans);
router.get('/:id',     protect(...READ_ROLES), ctrl.getLoanById);

router.post('/', protect(...WRITE_ROLES),
  body('borrowerType').isIn(BORROWER_TYPES).withMessage('Borrower type must be STUDENT or TEACHER'),
  body('borrowerName').notEmpty().withMessage('Borrower name is required'),
  body('bookTitle').notEmpty().withMessage('Book title is required'),
  body('dateReceived').isISO8601().withMessage('Valid date required'),
  body('dateReturned').optional({ values: 'falsy' }).isISO8601().withMessage('Valid date required'),
  validate, ctrl.createLoan);

router.patch('/:id', protect(...WRITE_ROLES),
  body('dateReturned').optional({ values: 'falsy' }).isISO8601().withMessage('Valid date required'),
  validate, ctrl.updateLoan);

router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteLoan);

module.exports = router;

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

// ── Books (library stock) ── (static paths must come before /:id)
router.get('/books',       protect(...READ_ROLES),  ctrl.listBooks);
router.post('/books',      protect(...WRITE_ROLES),
  body('title').notEmpty().withMessage('Book title is required'),
  body('totalCopies').optional().isInt({ min: 0 }).withMessage('Total copies must be a whole number'),
  validate, ctrl.createBook);
router.get('/summary',     protect(...READ_ROLES),  ctrl.getLibrarySummary);

// ── Loans ──
router.get('/',            protect(...READ_ROLES),  ctrl.listLoans);

router.post('/', protect(...WRITE_ROLES),
  body('borrowerType').optional({ values: 'falsy' }).isIn(BORROWER_TYPES).withMessage('Borrower type must be STUDENT or TEACHER'),
  body('borrowerName').optional({ values: 'falsy' }).isString().withMessage('Borrower name must be a string'),
  body('borrowerCode').optional({ values: 'falsy' }).isString().withMessage('Borrower ID must be a string'),
  body('bookTitle').optional({ values: 'falsy' }).isString().withMessage('Book title must be a string'),
  body('bookId').optional({ values: 'falsy' }).isUUID().withMessage('Valid book id required'),
  body('dateReceived').isISO8601().withMessage('Valid date required'),
  body('dateReturned').optional({ values: 'falsy' }).isISO8601().withMessage('Valid date required'),
  validate, ctrl.createLoan);

// ── Book by id ──
router.get('/books/:id',   protect(...READ_ROLES),  ctrl.getBook);
router.patch('/books/:id', protect(...WRITE_ROLES),
  body('title').optional().notEmpty().withMessage('Book title cannot be empty'),
  body('totalCopies').optional().isInt({ min: 0 }).withMessage('Total copies must be a whole number'),
  validate, ctrl.updateBook);
router.delete('/books/:id', protect(...WRITE_ROLES), ctrl.deleteBook);

// ── Loan by id ──
router.get('/:id',     protect(...READ_ROLES),  ctrl.getLoanById);
router.patch('/:id', protect(...WRITE_ROLES),
  body('dateReturned').optional({ values: 'falsy' }).isISO8601().withMessage('Valid date required'),
  validate, ctrl.updateLoan);
router.delete('/:id', protect(...WRITE_ROLES), ctrl.deleteLoan);

module.exports = router;

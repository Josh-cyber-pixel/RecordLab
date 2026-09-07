// src/modules/fees/fees.routes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl   = require('./fees.controller');
const { authenticate, protect } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const VIEW    = ['ADMIN', 'ACCOUNTANT', 'TEACHER', 'VIEWER'];
const FINANCE = ['ADMIN', 'ACCOUNTANT'];
const PAY     = ['ADMIN', 'ACCOUNTANT'];
const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'PAYSTACK'];

router.use(authenticate);

// Fee labels
router.get('/labels', protect(...VIEW), ctrl.getPresetLabels);

// Fee structures
router.get('/fee-structures', protect(...VIEW), ctrl.listFeeStructures);
router.post('/fee-structures', protect(...FINANCE),
  body('classId').notEmpty().withMessage('Class is required'),
  body('termId').notEmpty().withMessage('Term is required'),
  body('label').notEmpty().withMessage('Fee label is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601(),
  validate, ctrl.createFeeStructure);
router.patch('/fee-structures/:id', protect(...FINANCE),
  body('amount').optional().isFloat({ min: 0 }),
  body('dueDate').optional({ values: 'falsy' }).isISO8601(),
  validate, ctrl.updateFeeStructure);
router.delete('/fee-structures/:id', protect(...FINANCE), ctrl.deleteFeeStructure);

// Invoices
router.post('/invoices/student/:studentId/term/:termId/generate', protect(...FINANCE), ctrl.generateInvoice);
router.post('/invoices/class/:classId/term/:termId/generate-bulk', protect(...FINANCE), ctrl.generateInvoicesForClass);
router.get('/invoices', protect(...VIEW), ctrl.listInvoices);
router.get('/invoices/outstanding', protect(...FINANCE), ctrl.getOutstandingInvoices);
router.get('/invoices/summary', protect(...FINANCE), ctrl.getFeeSummary);
router.get('/invoices/:id', protect(...VIEW), ctrl.getInvoice);
router.get('/invoices/:id/export-pdf', protect(...VIEW), ctrl.exportInvoicePdf);

// Payments
router.post('/invoices/:invoiceId/payments', protect(...PAY),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('method').isIn(METHODS).withMessage('Invalid payment method'),
  validate, ctrl.recordPayment);
router.get('/invoices/:invoiceId/payments', protect(...VIEW), ctrl.listPayments);
router.get('/payments', protect(...VIEW), ctrl.listPayments);
router.get('/payments/:id/export-receipt-pdf', protect(...VIEW), ctrl.exportReceiptPdf);

// Validation
router.get('/validate/:number', protect(...FINANCE), ctrl.validateNumber);

module.exports = router;

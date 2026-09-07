// src/modules/expenses/expenses.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('./expenses.controller');
const { authenticate, protect } = require('../../middleware/auth');

const FINANCE_ROLES = ['ADMIN', 'ACCOUNTANT'];

router.use(authenticate);

router.get('/',             protect(...FINANCE_ROLES), ctrl.getExpenses);
router.get('/summary',      protect(...FINANCE_ROLES), ctrl.getExpenseSummary);
router.get('/export-pdf',   protect(...FINANCE_ROLES), ctrl.exportExpensesPdf);
router.get('/:id',          protect(...FINANCE_ROLES), ctrl.getExpenseById);
router.post('/',            protect(...FINANCE_ROLES), ctrl.createExpense);
router.patch('/:id',        protect(...FINANCE_ROLES), ctrl.updateExpense);
router.delete('/:id',       protect(...FINANCE_ROLES), ctrl.deleteExpense);

module.exports = router;

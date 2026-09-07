// src/modules/expenses/expenses.controller.js
const svc = require('./expenses.service');
const { success, created } = require('../../utils/response');

exports.createExpense = async (req, res, next) => {
  try { created(res, await svc.createExpense(req.body, req.schoolId, req.user.id), 'Expense recorded.'); }
  catch (e) { next(e); }
};

exports.getExpenses = async (req, res, next) => {
  try { success(res, await svc.getExpenses(req.schoolId, req.query)); }
  catch (e) { next(e); }
};

exports.getExpenseSummary = async (req, res, next) => {
  try { success(res, await svc.getExpenseSummary(req.schoolId, req.query)); }
  catch (e) { next(e); }
};

exports.getExpenseById = async (req, res, next) => {
  try { success(res, await svc.getExpenseById(req.params.id, req.schoolId)); }
  catch (e) { next(e); }
};

exports.updateExpense = async (req, res, next) => {
  try { success(res, await svc.updateExpense(req.params.id, req.body, req.schoolId), 'Expense updated.'); }
  catch (e) { next(e); }
};

exports.deleteExpense = async (req, res, next) => {
  try { success(res, await svc.deleteExpense(req.params.id, req.schoolId), 'Expense deleted.'); }
  catch (e) { next(e); }
};

exports.exportExpensesPdf = async (req, res, next) => {
  try {
    const { buffer, filename } = await svc.exportExpensesPdf(req.schoolId, req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) { next(e); }
};

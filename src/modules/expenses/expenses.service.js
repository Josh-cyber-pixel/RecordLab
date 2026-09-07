// src/modules/expenses/expenses.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError } = require('../../utils/errors');
const { buildExpensesPdf } = require('./expenses.pdf');

function buildDateFilter(preset, startDate, endDate) {
  const now = new Date();
  if (preset === 'this_month') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  }
  if (preset === 'last_month') {
    return { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lte: new Date(now.getFullYear(), now.getMonth(), 0) };
  }
  if (preset === 'this_year') {
    return { gte: new Date(now.getFullYear(), 0, 1), lte: new Date(now.getFullYear(), 11, 31) };
  }
  if (preset === 'custom' && startDate && endDate) {
    return { gte: new Date(startDate), lte: new Date(endDate) };
  }
  return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
}

const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD'];

async function createExpense(data, schoolId, recordedById) {
  const method = (data.paymentMethod || 'CASH').toUpperCase();
  if (!METHODS.includes(method)) throw badRequestError('Invalid payment method.');
  if (!data.category || !data.subCategory || !data.payee) {
    throw badRequestError('Category, sub-category and payee are required.');
  }
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequestError('Amount must be greater than 0.');

  return prisma.expense.create({
    data: {
      schoolId,
      recordedById,
      date:          new Date(data.date),
      category:      data.category,
      subCategory:   data.subCategory,
      description:   data.description ?? null,
      payee:         data.payee,
      amount,
      paymentMethod: method,
      sourceOfIncome: data.sourceOfIncome ?? 'OTHER',
      receipt:       data.receipt ?? null,
    },
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });
}

async function getExpenses(schoolId, { preset, startDate, endDate, category, sourceOfIncome } = {}) {
  const where = { schoolId };
  where.date = buildDateFilter(preset, startDate, endDate);
  if (category) where.category = category;
  if (sourceOfIncome) where.sourceOfIncome = sourceOfIncome;
  return prisma.expense.findMany({
    where,
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { date: 'desc' },
  });
}

async function getExpenseById(id, schoolId) {
  const expense = await prisma.expense.findFirst({ where: { id, schoolId } });
  if (!expense) throw notFoundError('Expense not found.');
  return expense;
}

async function updateExpense(id, data, schoolId) {
  await getExpenseById(id, schoolId);
  return prisma.expense.update({
    where: { id },
    data: {
      date:           data.date ? new Date(data.date) : undefined,
      category:       data.category,
      subCategory:    data.subCategory,
      description:    data.description ?? null,
      payee:          data.payee,
      amount:         data.amount != null ? Number(data.amount) : undefined,
      paymentMethod:  data.paymentMethod ? String(data.paymentMethod).toUpperCase() : undefined,
      sourceOfIncome: data.sourceOfIncome,
      receipt:        data.receipt ?? null,
    },
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });
}

async function deleteExpense(id, schoolId) {
  await getExpenseById(id, schoolId);
  return prisma.expense.delete({ where: { id } });
}

async function getExpenseSummary(schoolId, { preset, startDate, endDate } = {}) {
  const expenses = await getExpenses(schoolId, { preset, startDate, endDate });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = {};
  const bySource = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    bySource[e.sourceOfIncome] = (bySource[e.sourceOfIncome] || 0) + e.amount;
  }
  return { total, count: expenses.length, byCategory, bySource };
}

function buildFilterLabel(preset, startDate, endDate) {
  const labels = { this_month: 'This Month', last_month: 'Last Month', this_year: 'This Year' };
  if (preset === 'custom' && startDate && endDate) return `${startDate} to ${endDate}`;
  return labels[preset] || 'This Month';
}

async function exportExpensesPdf(schoolId, { preset, startDate, endDate, category } = {}) {
  const [expenses, summary, school] = await Promise.all([
    getExpenses(schoolId, { preset, startDate, endDate, category }),
    getExpenseSummary(schoolId, { preset, startDate, endDate }),
    prisma.school.findFirst({ where: { id: schoolId } }),
  ]);
  const filterLabel = buildFilterLabel(preset, startDate, endDate);
  const buffer = await buildExpensesPdf(expenses, summary, filterLabel, school);
  const safeLabel = filterLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  return { buffer, filename: `expenses-${safeLabel}.pdf` };
}

module.exports = {
  createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, getExpenseSummary, exportExpensesPdf,
};

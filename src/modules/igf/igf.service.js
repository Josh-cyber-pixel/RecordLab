// src/modules/igf/igf.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError } = require('../../utils/errors');

// ── Income (any source: Worship, Canteen, Donations, EGF, etc.) ───────────────

async function listIncome(schoolId, { source, startDate, endDate } = {}) {
  const where = { schoolId };
  if (source) where.source = source;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }
  return prisma.income.findMany({ where, orderBy: { date: 'desc' } });
}

// Term totals based on the academic year split (Term 1: Sep-Dec, Term 2: Jan-Apr, Term 3: May-Jul)
function termOf(date) {
  const m = new Date(date).getMonth() + 1; // 1-12
  return m >= 9 ? 1 : (m <= 4 ? 2 : 3);
}

function computeTermTotals(income) {
  const totals = { term1: 0, term2: 0, term3: 0 };
  for (const row of income) totals[`term${termOf(row.date)}`] += row.amount;
  totals.total = totals.term1 + totals.term2 + totals.term3;
  return totals;
}

async function getIncomeSummary(schoolId, { source } = {}) {
  const income = await listIncome(schoolId, { source });
  return { count: income.length, ...computeTermTotals(income) };
}

async function getIncomeById(id, schoolId) {
  const row = await prisma.income.findFirst({ where: { id, schoolId } });
  if (!row) throw notFoundError('Income record not found.');
  return row;
}

async function createIncome(data, schoolId) {
  const source = String(data.source || '').trim();
  if (!source) throw badRequestError('Income source is required.');
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) throw badRequestError('Amount must be >= 0.');
  return prisma.income.create({
    data: {
      schoolId,
      source,
      date:   new Date(data.date),
      amount,
    },
  });
}

async function updateIncome(id, data, schoolId) {
  await getIncomeById(id, schoolId);
  return prisma.income.update({
    where: { id },
    data: {
      source: data.source != null ? String(data.source).trim() : undefined,
      date:   data.date ? new Date(data.date) : undefined,
      amount: data.amount != null ? Number(data.amount) : undefined,
    },
  });
}

async function deleteIncome(id, schoolId) {
  await getIncomeById(id, schoolId);
  return prisma.income.delete({ where: { id } });
}

async function getIncomeSources(schoolId) {
  const rows = await prisma.income.findMany({ where: { schoolId }, select: { source: true }, orderBy: { date: 'desc' } });
  return [...new Set(rows.map(r => r.source).filter(Boolean))].sort();
}

module.exports = {
  listIncome, getIncomeSummary, getIncomeById, createIncome, updateIncome, deleteIncome, getIncomeSources,
};

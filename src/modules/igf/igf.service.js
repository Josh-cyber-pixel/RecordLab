// src/modules/igf/igf.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

// ── IGF Income (Worship + Canteen) ───────────────────────────────────────────

async function listIncome(schoolId, { source, startDate, endDate } = {}) {
  const where = { schoolId };
  if (source) where.source = source;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }
  return prisma.igfIncome.findMany({ where, orderBy: { date: 'desc' } });
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
  const row = await prisma.igfIncome.findFirst({ where: { id, schoolId } });
  if (!row) throw notFoundError('IGF income record not found.');
  return row;
}

async function createIncome(data, schoolId) {
  return prisma.igfIncome.create({
    data: {
      schoolId,
      source: data.source,
      date:   new Date(data.date),
      amount: parseFloat(data.amount),
    },
  });
}

async function updateIncome(id, data, schoolId) {
  await getIncomeById(id, schoolId);
  return prisma.igfIncome.update({
    where: { id },
    data: {
      source: data.source,
      date:   data.date ? new Date(data.date) : undefined,
      amount: data.amount != null ? parseFloat(data.amount) : undefined,
    },
  });
}

async function deleteIncome(id, schoolId) {
  await getIncomeById(id, schoolId);
  return prisma.igfIncome.delete({ where: { id } });
}

// ── School Projects ──────────────────────────────────────────────────────────

async function listProjects(schoolId, { startDate, endDate } = {}) {
  const where = { schoolId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }
  return prisma.schoolProject.findMany({ where, orderBy: { date: 'desc' } });
}

async function getProjectById(id, schoolId) {
  const project = await prisma.schoolProject.findFirst({ where: { id, schoolId } });
  if (!project) throw notFoundError('Project record not found.');
  return project;
}

async function createProject(data, schoolId) {
  return prisma.schoolProject.create({
    data: {
      schoolId,
      date:        new Date(data.date),
      projectType: data.projectType,
      benefits:    parseFloat(data.benefits),
    },
  });
}

async function updateProject(id, data, schoolId) {
  await getProjectById(id, schoolId);
  return prisma.schoolProject.update({
    where: { id },
    data: {
      date:        data.date ? new Date(data.date) : undefined,
      projectType: data.projectType,
      benefits:    data.benefits != null ? parseFloat(data.benefits) : undefined,
    },
  });
}

async function deleteProject(id, schoolId) {
  await getProjectById(id, schoolId);
  return prisma.schoolProject.delete({ where: { id } });
}

async function getProjectsSummary(schoolId) {
  const projects = await listProjects(schoolId);
  const totalBenefits = projects.reduce((s, p) => s + p.benefits, 0);
  return { count: projects.length, totalBenefits };
}

module.exports = {
  listIncome, getIncomeSummary, getIncomeById, createIncome, updateIncome, deleteIncome,
  listProjects, getProjectById, createProject, updateProject, deleteProject, getProjectsSummary,
};

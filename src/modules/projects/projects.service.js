// src/modules/projects/projects.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError } = require('../../utils/errors');

async function listProjects(schoolId) {
  return prisma.project.findMany({
    where: { schoolId },
    include: { expense: { select: { id: true, date: true, amount: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getProject(id, schoolId) {
  const project = await prisma.project.findFirst({ where: { id, schoolId }, include: { expense: true } });
  if (!project) throw notFoundError('Project not found.');
  return project;
}

async function createProject(data, schoolId, recordedById) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequestError('Project amount must be greater than 0.');
  if (!data.name) throw badRequestError('Project name is required.');

  const fundSource = (data.fundSource || 'IGF').toUpperCase();
  if (!['IGF', 'EGF', 'OTHER'].includes(fundSource)) throw badRequestError('Fund source must be IGF, EGF, or OTHER.');

  const expense = await prisma.expense.create({
    data: {
      schoolId,
      recordedById,
      date: new Date(data.startDate || new Date()),
      category: 'PROJECTS',
      subCategory: data.name,
      description: data.description || null,
      payee: data.name,
      amount,
      paymentMethod: 'CASH',
      sourceOfIncome: fundSource,
    },
  });

  return prisma.project.create({
    data: {
      schoolId,
      name: data.name,
      description: data.description || null,
      startDate: new Date(data.startDate || new Date()),
      amount,
      fundSource,
      status: data.status || 'ONGOING',
      expense: { connect: { id: expense.id } },
    },
    include: { expense: { select: { id: true, date: true, amount: true } } },
  });
}

async function updateProject(id, data, schoolId) {
  const project = await getProject(id, schoolId);
  const amount = data.amount != null ? Number(data.amount) : undefined;
  if (amount != null && (!Number.isFinite(amount) || amount <= 0)) throw badRequestError('Project amount must be greater than 0.');

  const fundSource = data.fundSource ? String(data.fundSource).toUpperCase() : undefined;
  if (fundSource && !['IGF', 'EGF', 'OTHER'].includes(fundSource)) throw badRequestError('Fund source must be IGF, EGF, or OTHER.');

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      amount,
      fundSource,
      status: data.status || undefined,
    },
  });

  // Sync linked expense
  if (project.expense?.id) {
    await prisma.expense.update({
      where: { id: project.expense.id },
      data: {
        date: data.startDate ? new Date(data.startDate) : undefined,
        category: 'PROJECTS',
        subCategory: updated.name,
        description: updated.description || null,
        payee: updated.name,
        amount: updated.amount,
        sourceOfIncome: updated.fundSource,
      },
    });
  }

  return getProject(id, schoolId);
}

async function deleteProject(id, schoolId) {
  const project = await getProject(id, schoolId);
  if (project.expense?.id) {
    await prisma.expense.delete({ where: { id: project.expense.id } });
  }
  return prisma.project.delete({ where: { id } });
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };

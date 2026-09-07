// src/modules/academic/academic.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError } = require('../../utils/errors');

// ─── AcademicYears ───────────────────────────────────────────────────────────

async function listYears(schoolId) {
  return prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startDate: 'desc' },
    include: { terms: { orderBy: { startDate: 'asc' } } },
  });
}

async function getYear(id, schoolId) {
  const year = await prisma.academicYear.findFirst({
    where: { id, schoolId },
    include: { terms: { orderBy: { startDate: 'asc' } } },
  });
  if (!year) throw notFoundError('Academic year not found.');
  return year;
}

async function createYear(data, schoolId) {
  if (data.isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId },
      data: { isCurrent: false },
    });
  }
  return prisma.academicYear.create({
    data: {
      schoolId,
      name:      data.name,
      startDate: new Date(data.startDate),
      endDate:   new Date(data.endDate),
      isCurrent: data.isCurrent ?? false,
      status:    data.status || 'IN_PROGRESS',
    },
    include: { terms: true },
  });
}

async function updateYear(id, data, schoolId) {
  await getYear(id, schoolId);
  if (data.isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId, id: { not: id } },
      data: { isCurrent: false },
    });
  }
  return prisma.academicYear.update({
    where: { id },
    data: {
      name:      data.name,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate ? new Date(data.endDate) : undefined,
      isCurrent: data.isCurrent,
      status:    data.status,
    },
    include: { terms: true },
  });
}

async function deleteYear(id, schoolId) {
  await getYear(id, schoolId);
  return prisma.academicYear.delete({ where: { id } });
}

// ─── Terms ───────────────────────────────────────────────────────────────────

async function listTerms(yearId, schoolId) {
  const year = await getYear(yearId, schoolId);
  return prisma.term.findMany({
    where: { academicYearId: year.id },
    orderBy: { startDate: 'asc' },
  });
}

async function getTerm(id, schoolId) {
  const term = await prisma.term.findFirst({
    where: { id, schoolId },
    include: { academicYear: true },
  });
  if (!term) throw notFoundError('Term not found.');
  return term;
}

async function createTerm(yearId, data, schoolId) {
  const year = await getYear(yearId, schoolId);
  if (data.isCurrent) {
    await prisma.term.updateMany({
      where: { schoolId },
      data: { isCurrent: false },
    });
  }
  return prisma.term.create({
    data: {
      academicYearId: year.id,
      schoolId,
      name:      data.name,
      startDate: new Date(data.startDate),
      endDate:   new Date(data.endDate),
      isCurrent: data.isCurrent ?? false,
    },
    include: { academicYear: true },
  });
}

async function updateTerm(id, data, schoolId) {
  await getTerm(id, schoolId);
  if (data.isCurrent) {
    await prisma.term.updateMany({
      where: { schoolId, id: { not: id } },
      data: { isCurrent: false },
    });
  }
  return prisma.term.update({
    where: { id },
    data: {
      name:      data.name,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate ? new Date(data.endDate) : undefined,
      isCurrent: data.isCurrent,
    },
    include: { academicYear: true },
  });
}

async function deleteTerm(id, schoolId) {
  await getTerm(id, schoolId);
  return prisma.term.delete({ where: { id } });
}

async function getCurrentTerm(schoolId) {
  const term = await prisma.term.findFirst({
    where: { schoolId, isCurrent: true },
    include: { academicYear: true },
  });
  if (!term) {
    const year = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      include: { terms: { orderBy: { startDate: 'asc' }, take: 1 } },
    });
    if (!year || year.terms.length === 0) {
      throw badRequestError('No current academic year or term set. Please configure one first.');
    }
    return getTerm(year.terms[0].id, schoolId);
  }
  return term;
}

module.exports = {
  listYears, getYear, createYear, updateYear, deleteYear,
  listTerms, getTerm, createTerm, updateTerm, deleteTerm, getCurrentTerm,
};

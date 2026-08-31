// src/modules/library/library.service.js
const prisma = require('../../config/prisma');
const { notFoundError } = require('../../utils/errors');

async function listLoans(schoolId, { borrowerType, status } = {}) {
  const where = { schoolId };
  if (borrowerType) where.borrowerType = borrowerType;
  if (status === 'OUTSTANDING') where.dateReturned = null;
  if (status === 'RETURNED')    where.dateReturned = { not: null };

  const loans = await prisma.libraryLoan.findMany({ where, orderBy: { dateReceived: 'desc' } });

  // status is DERIVED — not stored
  return loans.map(l => ({
    ...l,
    status: l.dateReturned ? 'RETURNED' : 'OUTSTANDING',
  }));
}

async function getLoanById(id, schoolId) {
  const loan = await prisma.libraryLoan.findFirst({ where: { id, schoolId } });
  if (!loan) throw notFoundError('Loan record not found.');
  return loan;
}

async function createLoan(data, schoolId) {
  return prisma.libraryLoan.create({
    data: {
      schoolId,
      borrowerType: data.borrowerType,
      borrowerName: data.borrowerName,
      bookTitle:    data.bookTitle,
      dateReceived: new Date(data.dateReceived),
      dateReturned: data.dateReturned ? new Date(data.dateReturned) : null,
    },
  });
}

async function updateLoan(id, data, schoolId) {
  await getLoanById(id, schoolId);
  return prisma.libraryLoan.update({
    where: { id },
    data: {
      borrowerType: data.borrowerType,
      borrowerName: data.borrowerName,
      bookTitle:    data.bookTitle,
      dateReceived: data.dateReceived ? new Date(data.dateReceived) : undefined,
      dateReturned: data.dateReturned ? new Date(data.dateReturned) : null,
    },
  });
}

async function deleteLoan(id, schoolId) {
  await getLoanById(id, schoolId);
  return prisma.libraryLoan.delete({ where: { id } });
}

async function getLibrarySummary(schoolId) {
  const loans = await listLoans(schoolId);
  const outstanding = loans.filter(l => l.status === 'OUTSTANDING').length;
  return { total: loans.length, outstanding, returned: loans.length - outstanding };
}

module.exports = { listLoans, getLoanById, createLoan, updateLoan, deleteLoan, getLibrarySummary };

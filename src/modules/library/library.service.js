// src/modules/library/library.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError, conflictError } = require('../../utils/errors');

// status is DERIVED — not stored
const deriveStatus = (loan) => ({
  ...loan,
  status: loan.dateReturned ? 'RETURNED' : 'OUTSTANDING',
});

// ─────────────────────────────────────────────────────────────────────
// Books (Library stock)
// ─────────────────────────────────────────────────────────────────────
async function listBooks(schoolId) {
  const books = await prisma.libraryBook.findMany({
    where: { schoolId },
    include: { _count: { select: { loans: { where: { dateReturned: null } } } } },
    orderBy: { title: 'asc' },
  });

  return books.map((b) => {
    const borrowedCopies = b._count.loans;
    return {
      ...b,
      borrowedCopies,
      availableCopies: Math.max(0, b.totalCopies - borrowedCopies),
    };
  });
}

async function getBook(id, schoolId) {
  const book = await prisma.libraryBook.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { loans: { where: { dateReturned: null } } } } },
  });
  if (!book) throw notFoundError('Book not found in library stock.');
  const borrowedCopies = book._count.loans;
  return {
    ...book,
    borrowedCopies,
    availableCopies: Math.max(0, book.totalCopies - borrowedCopies),
  };
}

async function createBook(data, schoolId) {
  const totalCopies = data.totalCopies != null ? Math.max(0, Math.floor(parseFloat(data.totalCopies) || 0)) : 1;
  const book = await prisma.libraryBook.create({
    data: {
      schoolId,
      title:       data.title,
      author:      data.author ?? null,
      totalCopies,
    },
  });
  return book;
}

async function updateBook(id, data, schoolId) {
  await getBook(id, schoolId);
  const totalCopies = data.totalCopies != null
    ? Math.max(0, Math.floor(parseFloat(data.totalCopies) || 0))
    : undefined;
  const book = await prisma.libraryBook.update({
    where: { id },
    data: {
      title:       data.title,
      author:      data.author ?? undefined,
      totalCopies,
    },
  });
  return getBook(id, schoolId);
}

async function deleteBook(id, schoolId) {
  await getBook(id, schoolId);
  const loanCount = await prisma.libraryLoan.count({ where: { bookId: id } });
  if (loanCount > 0) {
    throw conflictError('Cannot delete a book that has borrowing history.');
  }
  return prisma.libraryBook.delete({ where: { id } });
}

// ─────────────────────────────────────────────────────────────────────
// Loans
// ─────────────────────────────────────────────────────────────────────
async function listLoans(schoolId, { borrowerType, status, bookId } = {}) {
  const where = { schoolId };
  if (borrowerType) where.borrowerType = borrowerType;
  if (bookId)       where.bookId = bookId;
  if (status === 'OUTSTANDING') where.dateReturned = null;
  if (status === 'RETURNED')    where.dateReturned = { not: null };

  const loans = await prisma.libraryLoan.findMany({ where, orderBy: { dateReceived: 'desc' } });
  return loans.map(deriveStatus);
}

async function getLoanById(id, schoolId) {
  const loan = await prisma.libraryLoan.findFirst({ where: { id, schoolId } });
  if (!loan) throw notFoundError('Loan record not found.');
  return deriveStatus(loan);
}

async function createLoan(data, schoolId) {
  let bookId = data.bookId || null;
  let bookTitle = data.bookTitle || null;

  if (bookId) {
    const book = await getBook(bookId, schoolId);
    if (book.availableCopies < 1) {
      throw conflictError(`No available copies left for "${book.title}".`);
    }
    bookTitle = book.title;
  }

  if (!bookTitle) {
    throw badRequestError('Book title is required (provide bookId or bookTitle).');
  }

  // Resolve borrower from ID (STU-* student code or T-* teacher no), if provided
  let borrowerType = data.borrowerType;
  let borrowerName = data.borrowerName;
  let borrowerCode = data.borrowerCode || null;
  if (borrowerCode) {
    const resolved = await resolveBorrower(borrowerCode, schoolId);
    borrowerType = resolved.type;
    borrowerName = resolved.name;
  }
  if (!borrowerType || !borrowerName) {
    throw badRequestError('Borrower type and name are required (or provide a valid student/teacher ID).');
  }

  const loan = await prisma.libraryLoan.create({
    data: {
      schoolId,
      bookId:       bookId || null,
      borrowerType,
      borrowerName,
      borrowerCode,
      bookTitle,
      dateReceived: new Date(data.dateReceived),
      dateReturned: data.dateReturned ? new Date(data.dateReturned) : null,
    },
  });
  return deriveStatus(loan);
}

// Resolve a borrower by their special ID: STU-* (student) or T-* (teacher no)
async function resolveBorrower(code, schoolId) {
  const normalized = String(code).trim();
  if (normalized.toUpperCase().startsWith('STU') || normalized.toUpperCase().startsWith('STD')) {
    const student = await prisma.student.findFirst({
      where: { schoolId, studentCode: { equals: normalized, mode: 'insensitive' } },
    });
    if (!student) throw notFoundError(`No student found with ID "${code}".`);
    return { type: 'STUDENT', name: student.name, code: student.studentCode };
  }
  const teacher = await prisma.user.findFirst({
    where: { schoolId, role: 'TEACHER', teacherNo: { equals: normalized, mode: 'insensitive' } },
  });
  if (!teacher) throw notFoundError(`No teacher found with ID "${code}".`);
  return { type: 'TEACHER', name: `${teacher.firstName} ${teacher.lastName}`, code: teacher.teacherNo };
}

async function updateLoan(id, data, schoolId) {
  await getLoanById(id, schoolId);

  let bookId = data.bookId;
  let bookTitle = data.bookTitle;
  if (bookId) {
    const book = await getBook(bookId, schoolId);
    bookTitle = book.title;
  }

  let borrowerType = data.borrowerType;
  let borrowerName = data.borrowerName;
  let borrowerCode = data.borrowerCode;
  if (borrowerCode) {
    const resolved = await resolveBorrower(borrowerCode, schoolId);
    borrowerType = resolved.type;
    borrowerName = resolved.name;
  }

  const loan = await prisma.libraryLoan.update({
    where: { id },
    data: {
      borrowerType,
      borrowerName,
      borrowerCode,
      bookId:       bookId !== undefined ? (bookId || null) : undefined,
      bookTitle:    bookTitle !== undefined ? bookTitle : undefined,
      dateReceived: data.dateReceived ? new Date(data.dateReceived) : undefined,
      dateReturned: data.dateReturned ? new Date(data.dateReturned) : null,
    },
  });
  return deriveStatus(loan);
}

async function deleteLoan(id, schoolId) {
  await getLoanById(id, schoolId);
  return prisma.libraryLoan.delete({ where: { id } });
}

async function getLibrarySummary(schoolId) {
  const books = await listBooks(schoolId);
  const loans = await prisma.libraryLoan.findMany({ where: { schoolId } });
  const outstanding = loans.filter(l => !l.dateReturned).length;

  return {
    totalTitles:    books.length,
    totalCopies:    books.reduce((s, b) => s + b.totalCopies, 0),
    availableCopies: books.reduce((s, b) => s + b.availableCopies, 0),
    borrowedCopies:  outstanding,
    totalLoans:      loans.length,
    outstanding,
    returned:        loans.length - outstanding,
  };
}

module.exports = {
  listBooks, getBook, createBook, updateBook, deleteBook,
  listLoans, getLoanById, createLoan, updateLoan, deleteLoan,
  getLibrarySummary,
};

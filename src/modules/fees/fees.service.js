// src/modules/fees/fees.service.js
const prisma = require('../../config/prisma');
const { notFoundError, badRequestError, conflictError } = require('../../utils/errors');

const currency = (n) => `GHS ${(n || 0).toFixed(2)}`;

// ─── Fee Structures ──────────────────────────────────────────────────────────

async function listFeeStructures(schoolId, { classId, termId } = {}) {
  const where = { schoolId };
  if (classId) where.classId = classId;
  if (termId)  where.termId = termId;
  return prisma.feeStructure.findMany({
    where,
    include: {
      class: { select: { name: true } },
      term:  { select: { name: true, academicYear: { select: { name: true } } } },
    },
    orderBy: [{ term: { startDate: 'asc' } }, { label: 'asc' }],
  });
}

async function getFeeStructure(id, schoolId) {
  const item = await prisma.feeStructure.findFirst({ where: { id, schoolId } });
  if (!item) throw notFoundError('Fee structure not found.');
  return item;
}

async function createFeeStructure(data, schoolId) {
  const existing = await prisma.feeStructure.findFirst({
    where: { schoolId, classId: data.classId, termId: data.termId, label: data.label },
  });
  if (existing) throw conflictError('A fee with this label already exists for this class and term.');
  return prisma.feeStructure.create({
    data: {
      schoolId,
      classId:     data.classId,
      termId:      data.termId,
      label:       data.label,
      amount:      parseFloat(data.amount),
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      description: data.description ?? null,
    },
    include: {
      class: { select: { name: true } },
      term:  { select: { name: true, academicYear: { select: { name: true } } } },
    },
  });
}

async function updateFeeStructure(id, data, schoolId) {
  await getFeeStructure(id, schoolId);
  return prisma.feeStructure.update({
    where: { id },
    data: {
      label:       data.label,
      amount:      data.amount != null ? parseFloat(data.amount) : undefined,
      dueDate:     data.dueDate ? new Date(data.dueDate) : undefined,
      description: data.description ?? undefined,
    },
  });
}

async function deleteFeeStructure(id, schoolId) {
  await getFeeStructure(id, schoolId);
  return prisma.feeStructure.delete({ where: { id } });
}

// ─── Invoice Generation ──────────────────────────────────────────────────────

async function generateInvoiceNo(schoolId, tx = prisma) {
  const year  = new Date().getFullYear();
  const count = await tx.invoice.count({ where: { schoolId } });
  return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
}

async function generateReceiptNo(schoolId, tx = prisma) {
  const year  = new Date().getFullYear();
  const count = await tx.payment.count({ where: { schoolId } });
  return `RCT-${year}-${String(count + 1).padStart(6, '0')}`;
}

// Generate (or refresh) an invoice for a student + term from fee structures.
async function generateInvoiceForStudent(studentId, termId, schoolId) {
  const term = await prisma.term.findFirst({ where: { id: termId, schoolId } });
  if (!term) throw notFoundError('Term not found.');

  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) throw notFoundError('Student not found.');

  const feeItems = await prisma.feeStructure.findMany({
    where: { schoolId, classId: student.classId, termId },
    orderBy: { label: 'asc' },
  });
  if (feeItems.length === 0) throw badRequestError('No fee structure has been configured for this class and term.');

  const totalAmount = feeItems.reduce((s, i) => s + i.amount, 0);

  // Re-generate inside a transaction to keep items in sync
  return prisma.$transaction(async (tx) => {
    let invoice;
    const existing = await tx.invoice.findUnique({
      where: { schoolId_studentId_termId: { schoolId, studentId, termId } },
    });

    if (existing) {
      // Refresh the fee-line snapshot (payments link to the invoice, not items,
      // so regenerating item rows is always safe regardless of payments made).
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
      for (const f of feeItems) {
        await tx.invoiceItem.create({
          data: { invoiceId: existing.id, feeStructureId: f.id, label: f.label, amount: f.amount, paidAmount: 0 },
        });
      }
      const newBalance = totalAmount - existing.paidAmount;
      invoice = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          totalAmount,
          balance: newBalance,
          status: newBalance <= 0 ? 'PAID' : existing.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        },
        include: {
          items: true,
          payments: { orderBy: { paidAt: 'asc' } },
          student: true,
          term: { include: { academicYear: true } },
        },
      });
      return invoice;
    }

    const invoiceNo = await generateInvoiceNo(schoolId, tx);
    invoice = await tx.invoice.create({
      data: {
        schoolId, studentId, termId,
        invoiceNo,
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: 'UNPAID',
      },
    });
    for (const f of feeItems) {
      await tx.invoiceItem.create({
        data: { invoiceId: invoice.id, feeStructureId: f.id, label: f.label, amount: f.amount, paidAmount: 0 },
      });
    }
    return tx.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: true,
        payments: { orderBy: { paidAt: 'asc' } },
        student: true,
        term: { include: { academicYear: true } },
      },
    });
  });
}

async function generateInvoicesForClass(classId, termId, schoolId) {
  const term = await prisma.term.findFirst({ where: { id: termId, schoolId } });
  if (!term) throw notFoundError('Term not found.');
  const students = await prisma.student.findMany({ where: { schoolId, classId } });
  const results = [];
  for (const s of students) {
    try {
      const invoice = await generateInvoiceForStudent(s.id, termId, schoolId);
      results.push({ studentId: s.id, name: s.name, status: 'ok', invoice });
    } catch (err) {
      results.push({ studentId: s.id, name: s.name, status: 'error', message: err.message });
    }
  }
  return results;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

async function listInvoices(schoolId, { studentId, termId, classId, status } = {}) {
  const where = { schoolId };
  if (studentId) where.studentId = studentId;
  if (termId)    where.termId = termId;
  if (status)    where.status = status;
  if (classId) {
    const students = await prisma.student.findMany({ where: { schoolId, classId }, select: { id: true } });
    where.studentId = { in: students.map(s => s.id) };
  }
  return prisma.invoice.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, studentCode: true, class: { select: { name: true } } } },
      term: { include: { academicYear: { select: { name: true } } } },
      items: { include: { feeStructure: { select: { dueDate: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getInvoiceById(id, schoolId) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, schoolId },
    include: {
      student: { select: { id: true, name: true, studentCode: true, class: { select: { name: true } } } },
      term: { include: { academicYear: { select: { name: true } } } },
      items: true,
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!invoice) throw notFoundError('Invoice not found.');
  return invoice;
}

// ─── Payments ────────────────────────────────────────────────────────────────

async function recordPayment(invoiceId, data, schoolId) {
  if (data.amount <= 0) throw badRequestError('Payment amount must be greater than zero.');

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, schoolId } });
    if (!invoice) throw notFoundError('Invoice not found.');

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw badRequestError(`This invoice is ${invoice.status} and cannot accept further payments.`);
    }
    if (data.amount > invoice.balance) {
      throw badRequestError(`Amount exceeds the outstanding balance (${currency(invoice.balance)}).`);
    }

    const receiptNo = await generateReceiptNo(schoolId, tx);
    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount:       data.amount,
        method:       data.method,
        reference:    data.reference ?? null,
        receiptNo,
        receivedById: data.receivedById ?? null,
        notes:        data.notes ?? null,
      },
    });

    const newPaidAmount = invoice.paidAmount + data.amount;
    const newBalance    = invoice.totalAmount - newPaidAmount;
    const newStatus     = newBalance <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaidAmount, balance: newBalance, status: newStatus },
    });

    return { payment, invoice: updatedInvoice };
  });
}

async function listPayments(schoolId, { invoiceId } = {}) {
  const where = { schoolId };
  if (invoiceId) where.invoiceId = invoiceId;
  return prisma.payment.findMany({
    where,
    include: {
      invoice: { include: { student: true, term: { include: { academicYear: true } } } },
    },
    orderBy: { paidAt: 'desc' },
  });
}

// ─── Summary & Defaulters ────────────────────────────────────────────────────

async function getFeeSummary(schoolId, { termId } = {}) {
  const where = { schoolId };
  if (termId) where.termId = termId;
  const invoices = await prisma.invoice.findMany({ where });
  const invoiceCount = invoices.length;
  const totalInvoiced    = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected   = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const byStatus = invoices.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
  return {
    invoiceCount,
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    collectionRate: totalInvoiced > 0 ? parseFloat(((totalCollected / totalInvoiced) * 100).toFixed(2)) : 0,
    byStatus,
  };
}

async function getOutstandingInvoices(schoolId, { termId } = {}) {
  const where = { schoolId, balance: { gt: 0 } };
  if (termId) where.termId = termId;
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      student: {
        select: {
          id: true, name: true, studentCode: true,
          class: { select: { name: true } },
          enrollmentTerm: { select: { id: true, startDate: true } },
        },
      },
      term: { include: { academicYear: { select: { name: true } } } },
    },
    orderBy: { balance: 'desc' },
  });

  // A student enrolled part-way (e.g. Second Term) should not be a defaulter
  // for a term that started before they enrolled.
  const filtered = invoices.filter((inv) => {
    const enrolled = inv.student?.enrollmentTerm;
    if (!enrolled) return true; // no enrollment term recorded — keep
    const invStart = inv.term?.startDate;
    const enrolledStart = enrolled.startDate;
    if (!invStart || !enrolledStart) return true;
    return new Date(invStart) >= new Date(enrolledStart);
  });

  return filtered;
}

// ─── Number Validation ───────────────────────────────────────────────────────

async function validateNumber(number, schoolId) {
  const trimmed = String(number).trim().toUpperCase();

  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNo: trimmed, schoolId },
    include: {
      student: { select: { name: true, class: { select: { name: true } } } },
      term: { include: { academicYear: true } },
      items: true,
      payments: true,
    },
  });
  if (invoice) {
    return { found: true, type: 'INVOICE', number: trimmed, invoice };
  }

  const payment = await prisma.payment.findFirst({
    where: { receiptNo: trimmed, schoolId },
    include: {
      invoice: {
        include: { student: { select: { name: true } }, term: { include: { academicYear: true } } },
      },
    },
  });
  if (payment) {
    return { found: true, type: 'RECEIPT', number: trimmed, payment };
  }

  return { found: false, number: trimmed };
}

module.exports = {
  listFeeStructures, getFeeStructure, createFeeStructure, updateFeeStructure, deleteFeeStructure,
  generateInvoiceForStudent, generateInvoicesForClass,
  listInvoices, getInvoiceById,
  recordPayment, listPayments,
  getFeeSummary, getOutstandingInvoices,
  validateNumber,
};

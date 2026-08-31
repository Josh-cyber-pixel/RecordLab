// src/modules/ledger/ledger.service.js
const prisma = require('../../config/prisma');
const { notFoundError, conflictError } = require('../../utils/errors');

function withDerived(entry) {
  const paid = (entry.term1Amount || 0) + (entry.term2Amount || 0) + (entry.term3Amount || 0);
  return {
    ...entry,
    amountPaid: paid,
    amountOwing: (entry.expectedAmount || 0) - paid,
  };
}

async function listLedger(schoolId, { type, classId } = {}) {
  const where = { schoolId };
  if (type) where.type = type;
  if (classId) where.classId = classId;

  const entries = await prisma.classLedger.findMany({
    where,
    include: { class: { select: { id: true, name: true } } },
    orderBy: [{ class: { order: 'asc' } }, { createdAt: 'asc' }],
  });

  return entries.map(withDerived);
}

// Group ledger rows by class, with a per-class running S/N — the "per page" view.
async function listLedgerByClass(schoolId, { type } = {}) {
  const entries = await listLedger(schoolId, { type });
  const byClass = {};
  for (const e of entries) {
    const key = e.class?.name || 'Unassigned';
    if (!byClass[key]) byClass[key] = { className: key, rows: [] };
    byClass[key].rows.push({ serial: byClass[key].rows.length + 1, ...e });
  }
  const classes = Object.values(byClass);
  classes.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  return classes;
}

async function getLedgerSummary(schoolId, { type, classId } = {}) {
  const entries = await listLedger(schoolId, { type, classId });
  let expected = 0, paid = 0;
  for (const e of entries) { expected += e.expectedAmount || 0; paid += e.amountPaid || 0; }
  return { count: entries.length, expected, paid, owing: expected - paid };
}

async function getLedgerEntry(id, schoolId) {
  const entry = await prisma.classLedger.findFirst({ where: { id, schoolId } });
  if (!entry) throw notFoundError('Ledger entry not found.');
  return withDerived(entry);
}

async function createLedgerEntry(data, schoolId) {
  const existing = await prisma.classLedger.findFirst({
    where: { schoolId, type: data.type, classId: data.classId, studentName: data.studentName },
  });
  if (existing) throw conflictError('This student already has an entry for this class and type.');

  const entry = await prisma.classLedger.create({
    data: {
      schoolId,
      type:           data.type,
      classId:        data.classId,
      studentName:    data.studentName,
      expectedAmount: data.expectedAmount != null ? parseFloat(data.expectedAmount) : 0,
      term1Amount:    data.term1Amount != null ? parseFloat(data.term1Amount) : 0,
      term2Amount:    data.term2Amount != null ? parseFloat(data.term2Amount) : 0,
      term3Amount:    data.term3Amount != null ? parseFloat(data.term3Amount) : 0,
    },
  });
  return withDerived(entry);
}

async function updateLedgerEntry(id, data, schoolId) {
  await getLedgerEntry(id, schoolId);
  const entry = await prisma.classLedger.update({
    where: { id },
    data: {
      classId:        data.classId,
      studentName:    data.studentName,
      expectedAmount: data.expectedAmount != null ? parseFloat(data.expectedAmount) : undefined,
      term1Amount:    data.term1Amount != null ? parseFloat(data.term1Amount) : undefined,
      term2Amount:    data.term2Amount != null ? parseFloat(data.term2Amount) : undefined,
      term3Amount:    data.term3Amount != null ? parseFloat(data.term3Amount) : undefined,
    },
  });
  return withDerived(entry);
}

async function deleteLedgerEntry(id, schoolId) {
  await getLedgerEntry(id, schoolId);
  return prisma.classLedger.delete({ where: { id } });
}

// Bulk create/update entries for an entire class at once.
async function bulkUpsertLedger({ schoolId, type, classId, entries }) {
  await prisma.$transaction(
    entries.map(e =>
      prisma.classLedger.upsert({
        where: {
          schoolId_type_classId_studentName: {
            schoolId, type, classId, studentName: e.studentName,
          },
        },
        update: {
          expectedAmount: e.expected != null ? parseFloat(e.expected) : undefined,
          term1Amount:    e.term1 != null ? parseFloat(e.term1) : undefined,
          term2Amount:    e.term2 != null ? parseFloat(e.term2) : undefined,
          term3Amount:    e.term3 != null ? parseFloat(e.term3) : undefined,
        },
        create: {
          schoolId, type, classId,
          studentName:    e.studentName,
          expectedAmount: e.expected != null ? parseFloat(e.expected) : 0,
          term1Amount:    e.term1 != null ? parseFloat(e.term1) : 0,
          term2Amount:    e.term2 != null ? parseFloat(e.term2) : 0,
          term3Amount:    e.term3 != null ? parseFloat(e.term3) : 0,
        },
      })
    )
  );
  return listLedgerByClass(schoolId, { type });
}

module.exports = {
  listLedger, listLedgerByClass, getLedgerSummary, getLedgerEntry,
  createLedgerEntry, updateLedgerEntry, deleteLedgerEntry, bulkUpsertLedger,
};

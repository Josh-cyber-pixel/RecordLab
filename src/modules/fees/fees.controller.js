// src/modules/fees/fees.controller.js
const prisma = require('../../config/prisma');
const svc = require('./fees.service');
const { buildInvoicePdf, buildReceiptPdf } = require('./fees.pdf');
const { PRESET_FEE_LABELS } = require('./fees.labels');
const { notFoundError } = require('../../utils/errors');
const { success, created } = require('../../utils/response');

// ─── Fee Structures ──────────────────────────────────────────────────────────
exports.getPresetLabels = async (req, res, next) => {
  try { success(res, PRESET_FEE_LABELS); } catch (e) { next(e); }
};

exports.listFeeStructures = async (req, res, next) => {
  try {
    const { classId, termId } = req.query;
    success(res, await svc.listFeeStructures(req.schoolId, { classId, termId }));
  } catch (e) { next(e); }
};

exports.createFeeStructure = async (req, res, next) => {
  try {
    created(res, await svc.createFeeStructure(req.body, req.schoolId), 'Fee structure created');
  } catch (e) { next(e); }
};

exports.updateFeeStructure = async (req, res, next) => {
  try {
    success(res, await svc.updateFeeStructure(req.params.id, req.body, req.schoolId), 'Fee structure updated');
  } catch (e) { next(e); }
};

exports.deleteFeeStructure = async (req, res, next) => {
  try {
    success(res, await svc.deleteFeeStructure(req.params.id, req.schoolId), 'Fee structure deleted');
  } catch (e) { next(e); }
};

// ─── Invoices ────────────────────────────────────────────────────────────────
exports.generateInvoice = async (req, res, next) => {
  try {
    const { studentId, termId } = req.params;
    created(res, await svc.generateInvoiceForStudent(studentId, termId, req.schoolId), 'Invoice generated');
  } catch (e) { next(e); }
};

exports.generateInvoicesForClass = async (req, res, next) => {
  try {
    const { classId, termId } = req.params;
    const result = await svc.generateInvoicesForClass(classId, termId, req.schoolId);
    created(res, result, `Processed ${result.length} students`);
  } catch (e) { next(e); }
};

exports.listInvoices = async (req, res, next) => {
  try {
    const { studentId, termId, classId, status } = req.query;
    success(res, await svc.listInvoices(req.schoolId, { studentId, termId, classId, status }));
  } catch (e) { next(e); }
};

exports.getOutstandingInvoices = async (req, res, next) => {
  try {
    success(res, await svc.getOutstandingInvoices(req.schoolId, { termId: req.query.termId }));
  } catch (e) { next(e); }
};

exports.getFeeSummary = async (req, res, next) => {
  try {
    success(res, await svc.getFeeSummary(req.schoolId, { termId: req.query.termId }));
  } catch (e) { next(e); }
};

exports.getInvoice = async (req, res, next) => {
  try { success(res, await svc.getInvoiceById(req.params.id, req.schoolId)); } catch (e) { next(e); }
};

exports.exportInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await svc.getInvoiceById(req.params.id, req.schoolId);
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
    const buffer = await buildInvoicePdf(invoice, school);
    const safeNo = invoice.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${safeNo}.pdf"`);
    res.send(buffer);
  } catch (e) { next(e); }
};

// ─── Payments ────────────────────────────────────────────────────────────────
exports.recordPayment = async (req, res, next) => {
  try {
    const data = { ...req.body, receivedById: req.user.id };
    const result = await svc.recordPayment(req.params.invoiceId, data, req.schoolId);
    created(res, result, 'Payment recorded');
  } catch (e) { next(e); }
};

exports.listPayments = async (req, res, next) => {
  try {
    const invoiceId = req.params.invoiceId || req.query.invoiceId;
    success(res, await svc.listPayments(req.schoolId, { invoiceId }));
  } catch (e) { next(e); }
};

exports.exportReceiptPdf = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, schoolId: req.schoolId },
      include: {
        invoice: { include: { student: true, term: { include: { academicYear: true } } } },
      },
    });
    if (!payment) return next(notFoundError('Receipt not found.'));
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
    const buffer = await buildReceiptPdf(payment, school);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.receiptNo}.pdf"`);
    res.send(buffer);
  } catch (e) { next(e); }
};

// ─── Validation ──────────────────────────────────────────────────────────────
exports.validateNumber = async (req, res, next) => {
  try {
    success(res, await svc.validateNumber(req.params.number, req.schoolId));
  } catch (e) { next(e); }
};

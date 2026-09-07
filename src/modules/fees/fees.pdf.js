// src/modules/fees/fees.pdf.js
const PDFDocument = require('pdfkit');

const NAVY = '#1B2B4B';
const GOLD = '#C8932B';
const LIGHT_GREY = '#f5f5f5';

function drawSchoolHeader(doc, school, title) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const headerH = 90;

  doc.rect(0, 0, pageWidth, headerH).fill(NAVY);

  let textX = margin;
  if (school?.logo) {
    try {
      const b64 = school.logo.replace(/^data:image\/\w+;base64,/, '');
      doc.image(Buffer.from(b64, 'base64'), margin, 10, { height: 70, fit: [70, 70] });
      textX = margin + 80;
    } catch (_) {}
  }

  doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
    .text(school?.name ?? 'School', textX, 18, { width: pageWidth - textX - margin });

  const contact = [school?.email, school?.phone, school?.address].filter(Boolean);
  if (contact.length) {
    doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
      .text(contact.join('   ·   '), textX, 40, { width: pageWidth - textX - margin });
  }
  doc.fontSize(10).font('Helvetica').fillColor(GOLD)
    .text(title.toUpperCase(), textX, 56, { width: pageWidth - textX - margin, characterSpacing: 0.5 });

  doc.fillColor('#000');
  doc.y = headerH + 18;
  doc.moveTo(margin, headerH + 6).lineTo(pageWidth - margin, headerH + 6)
    .strokeColor(GOLD).lineWidth(1.5).stroke().lineWidth(1);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.8);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(text.toUpperCase(), { characterSpacing: 0.4 });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(NAVY).lineWidth(0.5).stroke().lineWidth(1);
  doc.moveDown(0.4);
  doc.fillColor('#000');
}

function footer(doc, school) {
  const pageBottom = doc.page.height - 40;
  doc.fontSize(7).fillColor('#aaa')
    .text(
      `${school?.name ?? ''} · Generated ${new Date().toLocaleDateString()} · This is a computer-generated document.`,
      50, pageBottom, { align: 'center', width: 495 }
    );
}

function money(n) { return `${(n || 0).toFixed(2)}`; }

function termLabel(term) {
  const parts = [term?.name];
  if (term?.academicYear?.name) parts.push(term.academicYear.name);
  return parts.filter(Boolean).join(' · ');
}

function buildPdf(callback) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    callback(doc);
    doc.end();
  });
}

// ─── Invoice / Fee Statement PDF ─────────────────────────────────────────────
function buildInvoicePdf(invoice, school) {
  return buildPdf((doc) => {
    drawSchoolHeader(doc, school, 'Fee Statement');

    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(termLabel(invoice.term), { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(1);

    // Student / invoice header info
    const statusColors = { PAID: '#16a34a', PARTIAL: '#d97706', UNPAID: '#dc2626', CANCELLED: '#6b7280' };
    const infoY = doc.y;
    const rows = [
      ['Student',  invoice.student?.name ?? '—'],
      ['Class',    invoice.student?.class?.name ?? '—'],
      ['Term',     termLabel(invoice.term)],
      ['Invoice No', invoice.invoiceNo ?? '—'],
      ['Issued',   invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '—'],
    ];
    rows.forEach(([k, v], i) => {
      const y = infoY + i * 18;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(`${k}:`, 50, y);
      doc.font('Helvetica').text(v, 150, y, { width: 340 });
    });
    const statusY = infoY + 5 * 18;
    doc.font('Helvetica-Bold').text('Status:', 50, statusY);
    doc.fillColor(statusColors[invoice.status] ?? '#000')
      .text(invoice.status ?? '—', 150, statusY);
    doc.fillColor('#000');
    doc.y = statusY + 24;

    // Fee breakdown
    sectionTitle(doc, 'Fee Breakdown');
    const col = { label: 50, amount: 460, paid: 380 };
    const thY = doc.y;
    doc.rect(50, thY - 2, 495, 16).fill(NAVY);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
    doc.text('Fee Item', col.label, thY, { width: 320 });
    doc.text('Paid', col.paid, thY, { width: 75, align: 'right' });
    doc.text('Amount (GHS)', col.amount, thY, { width: 80, align: 'right' });
    doc.fillColor('#000');
    doc.y = thY + 18;

    const items = invoice.items || [];
    if (items.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#888').text('No fee items found for this invoice.');
      doc.fillColor('#000');
    } else {
      items.forEach((it, idx) => {
        if (doc.y > 720) doc.addPage();
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(50, rowY - 2, 495, 16).fill(LIGHT_GREY);
        doc.fillColor('#000').font('Helvetica').fontSize(9);
        doc.text(it.label ?? '—', col.label, rowY, { width: 320 });
        doc.text(money(it.paidAmount), col.paid, rowY, { width: 75, align: 'right' });
        doc.font('Helvetica-Bold').text(money(it.amount), col.amount, rowY, { width: 80, align: 'right' });
        doc.moveDown(1.1);
      });
    }

    doc.moveDown(0.2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke().lineWidth(1);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
      .text('Total Fees:', col.label, doc.y)
      .text(money(invoice.totalAmount), col.amount, doc.y, { width: 80, align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(1.2);

    // Payment summary
    sectionTitle(doc, 'Payment Summary');
    const summaryX = 320;
    const valX = 460;
    const summaryRows = [
      { label: 'Total Amount:',  value: invoice.totalAmount ?? 0, bold: false, color: '#000' },
      { label: 'Amount Paid:',   value: invoice.paidAmount ?? 0,  bold: false, color: '#16a34a' },
      { label: 'Balance Due:',   value: invoice.balance ?? 0,     bold: true,  color: invoice.balance > 0 ? '#dc2626' : '#16a34a' },
    ];
    summaryRows.forEach(r => {
      const y = doc.y;
      doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000').text(r.label, summaryX, y);
      doc.fillColor(r.color).font(r.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(`GHS ${money(r.value)}`, valX, y, { width: 80, align: 'right' });
      doc.fillColor('#000');
      doc.moveDown(0.8);
    });

    // Payment history
    sectionTitle(doc, 'Payment History');
    const pcol = { date: 50, ref: 200, receipt: 340, amount: 460 };
    const phY = doc.y;
    doc.rect(50, phY - 2, 495, 16).fill(NAVY);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
    doc.text('Date', pcol.date, phY, { width: 140 });
    doc.text('Reference', pcol.ref, phY, { width: 130 });
    doc.text('Receipt No', pcol.receipt, phY, { width: 110 });
    doc.text('Amount (GHS)', pcol.amount, phY, { width: 80, align: 'right' });
    doc.fillColor('#000');
    doc.y = phY + 18;

    const payments = invoice.payments || [];
    if (payments.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#888').text('No payments recorded yet.', 50, doc.y);
      doc.fillColor('#000');
    } else {
      payments.forEach((p, idx) => {
        if (doc.y > 720) doc.addPage();
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(50, rowY - 2, 495, 16).fill(LIGHT_GREY);
        doc.fillColor('#000').font('Helvetica').fontSize(9);
        doc.text(p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—', pcol.date, rowY, { width: 140 });
        doc.text(p.reference ?? '—', pcol.ref, rowY, { width: 130 });
        doc.text(p.receiptNo ?? '—', pcol.receipt, rowY, { width: 110 });
        doc.font('Helvetica-Bold').text(money(p.amount), pcol.amount, rowY, { width: 80, align: 'right' });
        doc.moveDown(1.1);
      });
    }

    footer(doc, school);
  });
}

// ─── Receipt PDF ─────────────────────────────────────────────────────────────
// payment shape: { receiptNo, amount, method, reference, notes, paidAt,
//   invoice: { invoiceNo, student:{name, class:{name}}, term:{name, academicYear:{name}} } }
function buildReceiptPdf(payment, school) {
  return buildPdf((doc) => {
    drawSchoolHeader(doc, school, 'Official Receipt');

    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text('PAYMENT RECEIPT', { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(1);

    const invoice = payment.invoice || {};
    const term = invoice.term || {};
    const student = invoice.student || {};

    const rows = [
      ['Receipt No', payment.receiptNo ?? '—'],
      ['Invoice No', invoice.invoiceNo ?? '—'],
      ['Student',    student.name ?? '—'],
      ['Term',       termLabel(term)],
      ['Date Paid',  payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'],
      ['Method',     payment.method ?? '—'],
      ['Reference',  payment.reference ?? '—'],
    ];
    const infoY = doc.y;
    rows.forEach(([k, v], i) => {
      const y = infoY + i * 20;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(`${k}:`, 50, y);
      doc.font('Helvetica').text(v, 170, y, { width: 330 });
    });

    doc.y = infoY + rows.length * 20 + 14;
    sectionTitle(doc, 'Details');
    doc.font('Helvetica').fontSize(10).fillColor('#000')
      .text(`Amount Received: `, 50, doc.y, { continued: true })
      .font('Helvetica-Bold').fillColor('#16a34a')
      .text(`GHS ${money(payment.amount)}`);
    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(payment.notes ? `Notes: ${payment.notes}` : 'Thank you for your payment.', { width: 495 });

    footer(doc, school);
  });
}

module.exports = { buildInvoicePdf, buildReceiptPdf };

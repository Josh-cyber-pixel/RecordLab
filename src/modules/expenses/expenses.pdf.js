// src/modules/expenses/expenses.pdf.js
const PDFDocument = require('pdfkit');

const NAVY = '#1B2B4B';
const GOLD = '#C8932B';

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

function money(n) { return `GHS ${(n || 0).toFixed(2)}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

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

function buildExpensesPdf(expenses, summary, filterLabel, school) {
  return buildPdf((doc) => {
    drawSchoolHeader(doc, school, 'Expenses Report');

    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY)
      .text(`Expenses — ${filterLabel}`, doc.x, doc.y);
    doc.moveDown(0.4);

    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#000');
    doc.font('Helvetica-Bold').text('Total Spent:').font('Helvetica').text(` ${money(summary.total)}`, 50, metaY, { continued: true });
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text('Transactions:').font('Helvetica').text(` ${summary.count}`, 50, doc.y, { continued: true });

    doc.moveDown(0.8);

    const cols = { date: 50, category: 120, sub: 205, payee: 280, source: 345, method: 405, amount: 495 };
    const drawHeaderRow = () => {
      const thY = doc.y;
      doc.rect(50, thY, 495, 18).fill(NAVY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      doc.text('DATE', cols.date, thY, { width: 70 });
      doc.text('CATEGORY', cols.category, thY, { width: 85 });
      doc.text('SUB-CATEGORY', cols.sub, thY, { width: 75 });
      doc.text('PAYEE', cols.payee, thY, { width: 65 });
      doc.text('FUND', cols.source, thY, { width: 60 });
      doc.text('METHOD', cols.method, thY, { width: 40 });
      doc.text('AMOUNT', cols.amount, thY, { width: 80, align: 'right' });
      doc.fillColor('#000');
      doc.y = thY + 20;
    };

    if (expenses.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#666').text('No expenses found for this period.');
      return;
    }

    drawHeaderRow();
    expenses.forEach((e, idx) => {
      if (doc.y > 700) doc.addPage();
      if (idx > 0) {
        doc.rect(50, doc.y - 3, 495, 0.5).fill('#eeeeee');
      }
      doc.font('Helvetica').fontSize(8.5).fillColor('#000');
      doc.text(fmtDate(e.date), cols.date, doc.y, { width: 70 });
      doc.text(e.category, cols.category, doc.y, { width: 85 });
      doc.text(e.subCategory, cols.sub, doc.y, { width: 75 });
      doc.text(e.payee, cols.payee, doc.y, { width: 65 });
      doc.text(e.sourceOfIncome || 'OTHER', cols.source, doc.y, { width: 60 });
      doc.text(String(e.paymentMethod || '').replace(/_/g, ' '), cols.method, doc.y, { width: 40 });
      doc.text(money(e.amount), cols.amount, doc.y, { width: 80, align: 'right' });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Summary by Category');
    doc.fillColor('#000').font('Helvetica');
    for (const [cat, amt] of Object.entries(summary.byCategory || {}).sort((a, b) => b[1] - a[1])) {
      doc.fontSize(8.5).text(`${cat}:  ${money(amt)}`);
    }

    const pageBottom = doc.page.height - 40;
    doc.fontSize(7).fillColor('#aaa')
      .text(`${school?.name ?? ''} · Generated ${new Date().toLocaleDateString()} · This is a computer-generated document.`, 50, pageBottom, { align: 'center', width: 495 });
  });
}

module.exports = { buildExpensesPdf };

// src/modules/students/students.pdf.js
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

function fmtDate(d) {
  if (!d) return '—';
  if (d instanceof Date) return d.toLocaleDateString();
  return String(d);
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

// person shape: { name, studentCode|teacherNo, firstName, lastName, gender, dateOfBirth,
//   class:{name}, residentialStatus, address, bloodGroup, medicalNotes,
//   guardianName, guardianPhone, guardianRelation, enrollmentTerm,
//   debts: { fees:[], feesOutstanding, books:[], booksOutstanding } }
function buildStudentPdf(person, school) {
  return buildPdf((doc) => {
    drawSchoolHeader(doc, school, 'Student Record & Statement');

    const infoY = doc.y;
    const rows = [
      ['Student ID', person.studentCode ?? '—'],
      ['Name', person.name ?? '—'],
      ['Class', person.class?.name ?? '—'],
      ['Gender', person.gender ?? '—'],
      ['Date of Birth', person.dateOfBirth ? fmtDate(person.dateOfBirth) : '—'],
      ['Residential Status', person.residentialStatus ?? 'DAY'],
      ['Address', person.address ?? '—'],
      ['Blood Group', person.bloodGroup ?? '—'],
      ['Medical Notes', person.medicalNotes ?? '—'],
      ['Enrolled Term', termLabel(person.enrollmentTerm)],
      ['Guardian', [person.guardianName, person.guardianRelation].filter(Boolean).join(' (') ],
      ['Guardian Phone', person.guardianPhone ?? '—'],
    ];
    rows.forEach(([k, v], i) => {
      let val = v;
      if (k === 'Guardian') val = person.guardianName ? `${person.guardianName}${person.guardianRelation ? ` (${person.guardianRelation})` : ''}` : '—';
      if (doc.y > 700) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text(`${k}:`, 50, doc.y, { width: 150, continued: true });
      doc.font('Helvetica').fillColor('#333').text(val ?? '—', { width: 345 });
    });

    doc.moveDown(0.5);
    sectionTitle(doc, 'Outstanding Debts');

    const debts = person.debts || {};
    const feeDebts = debts.fees || [];
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Fees Owed');
    doc.fillColor('#000');
    if (feeDebts.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#16a34a').text('No outstanding fees.');
      doc.fillColor('#000');
    } else {
      const col = { term: 50, inv: 200, amount: 300, paid: 400, bal: 470 };
      const thY = doc.y;
      doc.rect(50, thY - 2, 495, 16).fill(NAVY);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
      doc.text('Term', col.term, thY, { width: 120 });
      doc.text('Invoice', col.inv, thY, { width: 90 });
      doc.text('Amount', col.amount, thY, { width: 80, align: 'right' });
      doc.text('Paid', col.paid, thY, { width: 60, align: 'right' });
      doc.text('Balance', col.bal, thY, { width: 70, align: 'right' });
      doc.fillColor('#000');
      doc.y = thY + 18;
      feeDebts.forEach((f, idx) => {
        if (doc.y > 720) doc.addPage();
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(50, rowY - 2, 495, 16).fill(LIGHT_GREY);
        doc.font('Helvetica').fontSize(9).fillColor('#000');
        doc.text(termLabel(f.term), col.term, rowY, { width: 120 });
        doc.text(f.invoiceNo, col.inv, rowY, { width: 90 });
        doc.text(money(f.amount), col.amount, rowY, { width: 80, align: 'right' });
        doc.text(money(f.paid), col.paid, rowY, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(money(f.balance), col.bal, rowY, { width: 70, align: 'right' });
        doc.fillColor('#000');
        doc.moveDown(1.05);
      });
    }

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Books Owed');
    doc.fillColor('#000');
    const bookDebts = debts.books || [];
    if (bookDebts.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#16a34a').text('No outstanding books.');
      doc.fillColor('#000');
    } else {
      bookDebts.forEach((b) => {
        if (doc.y > 720) doc.addPage();
        doc.font('Helvetica').fontSize(9).fillColor('#000')
          .text(`• ${b.bookTitle}`, 50, doc.y, { width: 400, continued: true })
          .fillColor('#888').text(`(since ${fmtDate(b.dateReceived)})`);
        doc.fillColor('#000');
        doc.moveDown(0.4);
      });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke().lineWidth(1);
    doc.moveDown(0.5);
    const totalDebt = (debts.feesOutstanding || 0);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
      .text('Total Fees Outstanding:', 50, doc.y, { width: 300, continued: true })
      .fillColor(totalDebt > 0 ? '#dc2626' : '#16a34a')
      .text(`GHS ${money(totalDebt)}`);

    footer(doc, school);
  });
}

module.exports = { buildStudentPdf };

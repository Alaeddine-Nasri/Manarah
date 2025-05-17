const PDFDocument = require('pdfkit');
const db = require('../db/db');

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function startPdf(res, filename) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function getSchoolName(school_id) {
  const row = db.prepare('SELECT name FROM schools WHERE id = ?').get(school_id);
  return row?.name || 'Manarah';
}

function drawHeader(doc, title, schoolName) {
  const top = doc.page.margins.top;
  doc
    .fontSize(18).font('Helvetica-Bold')
    .text(schoolName, doc.page.margins.left, top, { align: 'center' })
    .moveDown(0.3)
    .fontSize(11).font('Helvetica')
    .fillColor('#6b7280')
    .text(title, { align: 'center' })
    .moveDown(0.2)
    .text(new Date().toLocaleDateString('fr-DZ', { dateStyle: 'long' }), { align: 'center' })
    .fillColor('#000000')
    .moveDown(1);

  const lineY = doc.y;
  doc.moveTo(doc.page.margins.left, lineY)
     .lineTo(doc.page.width - doc.page.margins.right, lineY)
     .strokeColor('#e5e7eb').lineWidth(1).stroke()
     .strokeColor('#000000');
  doc.moveDown(0.8);
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const bottom = doc.page.height - doc.page.margins.bottom + 10;
    doc
      .fontSize(9).font('Helvetica').fillColor('#9ca3af')
      .text(`${i + 1} / ${range.count}`, doc.page.margins.left, bottom, {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      })
      .fillColor('#000000');
  }
}

/* ── Table builder ──────────────────────────────────────
   cols: [{ header, key, width, align }]
   rows: array of objects
──────────────────────────────────────────────────────── */
function drawTable(doc, cols, rows, { rowHeight = 24, headerBg = '#2563eb', headerColor = '#ffffff', fontSize = 9 } = {}) {
  const startX  = doc.page.margins.left;
  const endX    = doc.page.width - doc.page.margins.right;
  const totalW  = endX - startX;

  // Normalise widths — support fractions summing to 1 OR absolute px
  const sumW = cols.reduce((s, c) => s + (c.width || 1), 0);
  const resolved = cols.map(c => ({
    ...c,
    px: ((c.width || 1) / sumW) * totalW,
  }));

  function drawRowBg(y, color) {
    doc.rect(startX, y, totalW, rowHeight).fillColor(color).fill().fillColor('#000000');
  }

  function drawRowText(row, y, isHeader) {
    let x = startX;
    resolved.forEach(col => {
      const val = isHeader ? col.header : (row[col.key] ?? '');
      doc
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fontSize)
        .fillColor(isHeader ? headerColor : '#111827')
        .text(String(val), x + 4, y + 7, {
          width: col.px - 8,
          align: col.align || 'left',
          lineBreak: false,
          ellipsis: true,
        });
      x += col.px;
    });
    doc.fillColor('#000000');
  }

  function drawRowLines(y) {
    let x = startX;
    doc.moveTo(x, y).lineTo(endX, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    resolved.forEach(col => {
      x += col.px;
      if (x < endX) {
        doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#e5e7eb').lineWidth(0.3).stroke();
      }
    });
    doc.strokeColor('#000000');
  }

  // Header row
  let y = doc.y;
  drawRowBg(y, headerBg);
  drawRowText(null, y, true);
  y += rowHeight;

  // Data rows
  rows.forEach((row, idx) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRowBg(y, headerBg);
      drawRowText(null, y, true);
      y += rowHeight;
    }
    if (idx % 2 === 1) drawRowBg(y, '#f9fafb');
    drawRowLines(y);
    drawRowText(row, y, false);
    y += rowHeight;
  });

  // Bottom border
  doc.moveTo(startX, y).lineTo(endX, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.y = y + 8;
}

/* ─────────────────────────────────────────────
   EXPORT STUDENTS
───────────────────────────────────────────── */
exports.exportStudents = (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { level_id, year_id, group_id, status } = req.query;
    const schoolName = getSchoolName(school_id);

    let query = `
      SELECT s.name, s.status, s.phone, s.parent_phone,
             l.name as level_name, y.name as year_name, g.name as group_name
      FROM students s
      LEFT JOIN levels l ON s.level_id = l.id
      LEFT JOIN years  y ON s.year_id  = y.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.school_id = ?
    `;
    const params = [school_id];
    if (level_id) { query += ' AND s.level_id = ?'; params.push(level_id); }
    if (year_id)  { query += ' AND s.year_id = ?';  params.push(year_id); }
    if (group_id) {
      query += ` AND EXISTS (SELECT 1 FROM student_groups sg WHERE sg.student_id = s.id AND sg.group_id = ?)`;
      params.push(group_id);
    }
    if (status)   { query += ' AND s.status = ?';   params.push(status); }
    query += ' ORDER BY l.name, y.name, g.name, s.name';

    const students = db.prepare(query).all(...params);

    const doc = startPdf(res, 'students.pdf');

    drawHeader(doc, `Liste des élèves (${students.length})`, schoolName);

    const cols = [
      { header: 'Nom',         key: 'name',        width: 3 },
      { header: 'Niveau',      key: 'level_name',  width: 1.5 },
      { header: 'Année',       key: 'year_name',   width: 1.5 },
      { header: 'Groupe',      key: 'group_name',  width: 1.5 },
      { header: 'Statut',      key: 'status',      width: 1.2 },
      { header: 'Tél.',        key: 'phone',       width: 1.5 },
      { header: 'Tél. parent', key: 'parent_phone',width: 1.5 },
    ];
    drawTable(doc, cols, students);

    addPageNumbers(doc);
    doc.end();
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   EXPORT PAYMENTS REPORT
───────────────────────────────────────────── */
exports.exportPayments = (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { month, teacher_id, status } = req.query;
    const schoolName = getSchoolName(school_id);

    let query = `
      SELECT p.id, p.amount, p.teacher_amount, p.school_amount, p.type, p.created_at,
             p.sessions_count, p.sessions_paid, p.status as pay_status,
             s.name as student_name, t.name as teacher_name, m.name as module_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.school_id = ?
    `;
    const params = [school_id];
    if (month) {
      query += ` AND strftime('%Y-%m', p.created_at) = ?`;
      params.push(month);
    }
    if (teacher_id) {
      query += ' AND p.teacher_id = ?';
      params.push(teacher_id);
    }
    if (status) {
      // status is computed (current/due_soon/overdue) — filter by sessions remaining
      if (status === 'overdue') {
        query += ' AND p.sessions_paid >= p.sessions_count';
      } else if (status === 'due_soon') {
        query += ' AND (p.sessions_count - p.sessions_paid) BETWEEN 1 AND 2';
      } else if (status === 'current') {
        query += ' AND (p.sessions_count - p.sessions_paid) > 2';
      }
    }
    query += ' ORDER BY p.created_at DESC';

    const payments = db.prepare(query).all(...params);

    const totalAmount  = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalTeacher = payments.reduce((s, p) => s + (p.teacher_amount || 0), 0);
    const totalSchool  = payments.reduce((s, p) => s + (p.school_amount || 0), 0);

    const fmtDA = (n) => n != null ? `${Number(n).toFixed(0)} DA` : '—';
    const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-DZ') : '—';

    const rows = payments.map(p => ({
      student_name:   p.student_name,
      teacher_name:   p.teacher_name || '—',
      module_name:    p.module_name  || '—',
      type:           p.type,
      amount:         fmtDA(p.amount),
      teacher_amount: fmtDA(p.teacher_amount),
      school_amount:  fmtDA(p.school_amount),
      date:           fmtDate(p.created_at),
    }));

    const title = month
      ? `Rapport paiements — ${month}`
      : 'Rapport paiements — Tous';

    const doc = startPdf(res, `payments-${month || 'all'}.pdf`);

    drawHeader(doc, title, schoolName);

    const cols = [
      { header: 'Élève',       key: 'student_name',   width: 2.5 },
      { header: 'Enseignant',  key: 'teacher_name',   width: 2 },
      { header: 'Matière',     key: 'module_name',    width: 1.8 },
      { header: 'Type',        key: 'type',           width: 1 },
      { header: 'Montant',     key: 'amount',         width: 1.2, align: 'right' },
      { header: 'Part prof.',  key: 'teacher_amount', width: 1.2, align: 'right' },
      { header: 'Part école',  key: 'school_amount',  width: 1.2, align: 'right' },
      { header: 'Date',        key: 'date',           width: 1.2 },
    ];
    drawTable(doc, cols, rows);

    // Summary row
    doc.moveDown(0.5);
    const summaryY = doc.y;
    doc
      .font('Helvetica-Bold').fontSize(10)
      .text(`Total (${payments.length} paiements) :`, doc.page.margins.left, summaryY)
      .text(`${fmtDA(totalAmount)}  |  Prof: ${fmtDA(totalTeacher)}  |  École: ${fmtDA(totalSchool)}`,
        doc.page.margins.left, doc.y + 4, { align: 'right',
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });

    addPageNumbers(doc);
    doc.end();
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   RECEIPT — single payment
───────────────────────────────────────────── */
exports.exportPaymentReceipt = (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const payment = db.prepare(`
      SELECT p.*, s.name as student_name, t.name as teacher_name, m.name as module_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.id = ? AND p.school_id = ?
    `).get(id, school_id);

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const schoolName = getSchoolName(school_id);
    const doc = startPdf(res, `receipt-${id}.pdf`);

    const pw = doc.page.width;
    const ml = doc.page.margins.left;
    const mr = doc.page.margins.right;
    const cw = pw - ml - mr;

    // ── Receipt box header ──
    doc
      .rect(ml, doc.page.margins.top, cw, 70)
      .fillColor('#2563eb').fill().fillColor('#ffffff')
      .font('Helvetica-Bold').fontSize(20)
      .text(schoolName, ml, doc.page.margins.top + 12, { align: 'center', width: cw })
      .font('Helvetica').fontSize(11)
      .text('REÇU DE PAIEMENT', ml, doc.page.margins.top + 40, { align: 'center', width: cw })
      .fillColor('#000000');

    doc.y = doc.page.margins.top + 80;
    doc.moveDown(0.5);

    // Receipt number + date
    const receiptNo = String(payment.id).padStart(6, '0');
    doc
      .font('Helvetica').fontSize(10).fillColor('#6b7280')
      .text(`Reçu n° ${receiptNo}`, ml, doc.y, { continued: true, width: cw })
      .text(new Date(payment.created_at || Date.now()).toLocaleDateString('fr-DZ', { dateStyle: 'long' }),
        { align: 'right' })
      .fillColor('#000000');

    doc.moveDown(1);

    // Divider
    doc.moveTo(ml, doc.y).lineTo(ml + cw, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    // Details
    function detailRow(label, value) {
      const y = doc.y;
      doc
        .font('Helvetica').fontSize(10).fillColor('#6b7280')
        .text(label, ml, y, { width: cw * 0.45 })
        .font('Helvetica-Bold').fontSize(10).fillColor('#111827')
        .text(value, ml + cw * 0.45, y, { width: cw * 0.55, align: 'left' });
      doc.y = Math.max(doc.y, y + 20);
      doc.moveDown(0.4);
    }

    detailRow('Élève :',             payment.student_name);
    detailRow('Enseignant :',        payment.teacher_name || '—');
    detailRow('Matière :',           payment.module_name  || '—');
    detailRow('Type :',              payment.type);
    detailRow('Séances couvertes :', String(payment.sessions_count || '—'));

    doc.moveDown(0.5);
    doc.moveTo(ml, doc.y).lineTo(ml + cw, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    // Amount — big
    doc
      .rect(ml, doc.y, cw, 52)
      .fillColor('#f0fdf4').fill().fillColor('#000000');
    const amtY = doc.y + 10;
    doc
      .font('Helvetica').fontSize(11).fillColor('#059669')
      .text('MONTANT PAYÉ', ml, amtY, { align: 'center', width: cw })
      .font('Helvetica-Bold').fontSize(22).fillColor('#059669')
      .text(`${Number(payment.amount).toLocaleString()} DA`, ml, amtY + 18, { align: 'center', width: cw })
      .fillColor('#000000');
    doc.y = doc.y + 52 + 4;
    doc.moveDown(1);

    // Split detail (if available)
    if (payment.teacher_amount != null) {
      doc
        .font('Helvetica').fontSize(9).fillColor('#6b7280')
        .text(`Part enseignant : ${Number(payment.teacher_amount).toFixed(0)} DA    |    Part école : ${Number(payment.school_amount || 0).toFixed(0)} DA`,
          ml, doc.y, { align: 'center', width: cw })
        .fillColor('#000000');
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   RECEIPT — teacher payroll for a month
───────────────────────────────────────────── */
exports.exportTeacherPayroll = (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { teacher_id } = req.params;
    const { month } = req.query;

    if (!month) return res.status(400).json({ message: 'month is required' });

    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ? AND school_id = ?').get(teacher_id, school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const schoolName = getSchoolName(school_id);

    const payments = db.prepare(`
      SELECT p.amount, p.teacher_amount, p.sessions_count, p.type, p.created_at,
             s.name as student_name, m.name as module_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.teacher_id = ? AND p.school_id = ?
        AND strftime('%Y-%m', p.created_at) = ?
      ORDER BY p.created_at
    `).all(teacher_id, school_id, month);

    const totalEarnings = payments.reduce((s, p) => s + (p.teacher_amount || 0), 0);
    const totalSessions = payments.reduce((s, p) => s + (p.sessions_count || 0), 0);

    const doc = startPdf(res, `payroll-${teacher_id}-${month}.pdf`);

    const pw  = doc.page.width;
    const ml  = doc.page.margins.left;
    const mr  = doc.page.margins.right;
    const cw  = pw - ml - mr;

    // Header band
    doc
      .rect(ml, doc.page.margins.top, cw, 70)
      .fillColor('#2563eb').fill().fillColor('#ffffff')
      .font('Helvetica-Bold').fontSize(20)
      .text(schoolName, ml, doc.page.margins.top + 12, { align: 'center', width: cw })
      .font('Helvetica').fontSize(11)
      .text('FICHE DE PAIE', ml, doc.page.margins.top + 40, { align: 'center', width: cw })
      .fillColor('#000000');

    doc.y = doc.page.margins.top + 86;

    // Subtitle
    doc
      .font('Helvetica').fontSize(10).fillColor('#6b7280')
      .text(`Période : ${month}`, ml, doc.y, { continued: true, width: cw })
      .text(`Généré le ${new Date().toLocaleDateString('fr-DZ')}`, { align: 'right' })
      .fillColor('#000000')
      .moveDown(1);

    // Teacher info box
    doc
      .rect(ml, doc.y, cw, 44)
      .fillColor('#eff6ff').fill().fillColor('#000000');
    const infoY = doc.y + 8;
    doc
      .font('Helvetica-Bold').fontSize(13)
      .text(teacher.name, ml + 12, infoY)
      .font('Helvetica').fontSize(10).fillColor('#6b7280')
      .text(teacher.email || teacher.phone || '', ml + 12, infoY + 18)
      .fillColor('#000000');
    doc.y = doc.y + 52;
    doc.moveDown(1);

    // Payment table
    doc.font('Helvetica-Bold').fontSize(10).text('Détail des paiements :', ml, doc.y).moveDown(0.5);

    const cols = [
      { header: 'Élève',    key: 'student_name', width: 3 },
      { header: 'Matière',  key: 'module_name',  width: 2 },
      { header: 'Séances',  key: 'sessions_count', width: 1, align: 'center' },
      { header: 'Montant',  key: 'teacher_amount_fmt', width: 1.5, align: 'right' },
    ];

    const tableRows = payments.map(p => ({
      student_name:        p.student_name,
      module_name:         p.module_name || '—',
      sessions_count:      p.sessions_count || '—',
      teacher_amount_fmt:  `${Number(p.teacher_amount || 0).toFixed(0)} DA`,
    }));

    drawTable(doc, cols, tableRows, { headerBg: '#1d4ed8' });

    doc.moveDown(1);

    // Total box
    doc
      .rect(ml, doc.y, cw, 52)
      .fillColor('#f0fdf4').fill().fillColor('#000000');
    const totY = doc.y + 8;
    doc
      .font('Helvetica').fontSize(10).fillColor('#059669')
      .text(`${payments.length} paiements — ${totalSessions} séances`, ml, totY, { align: 'center', width: cw })
      .font('Helvetica-Bold').fontSize(20).fillColor('#059669')
      .text(`TOTAL : ${Number(totalEarnings).toFixed(0)} DA`, ml, totY + 20, { align: 'center', width: cw })
      .fillColor('#000000');

    doc.end();
  } catch (err) {
    next(err);
  }
};

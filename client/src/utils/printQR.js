import QRCode from 'qrcode';

// Business card size: 85mm × 54mm landscape — 2 cols × 3 rows = 6 per A4

async function buildCard(student, schoolName) {
  const dataUrl = await QRCode.toDataURL(student.qr_code || student.id.toString(), {
    width: 200, margin: 1, color: { dark: '#1e1e2e', light: '#ffffff' },
  });
  const level  = [student.level_name, student.year_name].filter(Boolean).join(' – ');
  const group  = student.group_name || '';
  const initials = (student.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `
    <div class="card">
      <!-- Red diagonal accent top-right -->
      <div class="accent-tr"></div>
      <!-- Red diagonal accent bottom-left -->
      <div class="accent-bl"></div>

      <!-- Top bar -->
      <div class="top-bar">
        <span class="top-bar-title">CARTE ÉTUDIANT</span>
        <span class="top-bar-school">${schoolName || ''}</span>
      </div>

      <!-- Body -->
      <div class="body">
        <!-- Left: QR -->
        <div class="qr-col">
          <div class="qr-wrap">
            <img src="${dataUrl}" width="88" height="88" />
          </div>
        </div>

        <!-- Right: student info -->
        <div class="info-col">
          <div class="avatar">${initials}</div>
          <div class="student-name">${student.name}</div>
          ${level  ? `<div class="field"><span class="field-lbl">Niveau</span><span class="field-val">${level}</span></div>` : ''}
          ${group  ? `<div class="field"><span class="field-lbl">Groupe</span><span class="field-val">${group}</span></div>` : ''}
          ${student.phone ? `<div class="field"><span class="field-lbl">Tél.</span><span class="field-val">${student.phone}</span></div>` : ''}
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="bottom-bar"></div>
    </div>
  `;
}

export async function printStudentQR(student, schoolName = '') {
  const card = await buildCard(student, schoolName);
  openPrintWindow(`<div class="single">${card}</div>`, student.name);
}

export async function printAllQR(students, schoolName = '') {
  const cards = await Promise.all(students.map(s => buildCard(s, schoolName)));
  openPrintWindow(`<div class="grid">${cards.join('')}</div>`, 'Cartes élèves');
}

function openPrintWindow(bodyContent, title) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; }

    /* ── Grid layout ───────────────────────────────── */
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 85mm);
      gap: 6mm;
      padding: 10mm;
      justify-content: center;
    }
    .single {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    /* ── Card shell ───────────────────────────────── */
    .card {
      width: 85mm;
      height: 54mm;
      background: #ffffff;
      border-radius: 7px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.13);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ── Corner accents ───────────────────────────── */
    .accent-tr {
      position: absolute;
      top: -8mm; right: -6mm;
      width: 20mm; height: 20mm;
      background: rgba(220,38,38,0.12);
      transform: rotate(30deg);
      border-radius: 3px;
    }
    .accent-bl {
      position: absolute;
      bottom: -6mm; left: -5mm;
      width: 18mm; height: 18mm;
      background: rgba(220,38,38,0.10);
      transform: rotate(30deg);
      border-radius: 3px;
    }

    /* ── Top bar ──────────────────────────────────── */
    .top-bar {
      background: #dc2626;
      padding: 2.5mm 4mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .top-bar-title {
      color: #fff;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .top-bar-school {
      color: rgba(255,255,255,0.85);
      font-size: 6.5pt;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      max-width: 40mm;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* ── Body ─────────────────────────────────────── */
    .body {
      flex: 1;
      display: flex;
      min-height: 0;
      padding: 3mm 3.5mm 2mm;
      gap: 3mm;
    }

    /* ── QR column ────────────────────────────────── */
    .qr-col {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-wrap {
      border: 2px solid #dc2626;
      border-radius: 5px;
      padding: 2px;
      background: #fff;
      display: flex;
    }
    .qr-wrap img { display: block; border-radius: 3px; }

    /* ── Info column ──────────────────────────────── */
    .info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      gap: 1.5mm;
    }
    .avatar {
      width: 7mm; height: 7mm;
      background: #dc2626;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6pt;
      font-weight: 700;
      flex-shrink: 0;
      margin-bottom: 0.5mm;
    }
    .student-name {
      font-size: 10pt;
      font-weight: 800;
      color: #dc2626;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .field {
      display: flex;
      align-items: baseline;
      gap: 1.5mm;
      font-size: 6.5pt;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
    }
    .field-lbl {
      color: #9ca3af;
      font-weight: 700;
      min-width: 10mm;
      flex-shrink: 0;
    }
    .field-val {
      color: #374151;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Bottom bar ───────────────────────────────── */
    .bottom-bar {
      height: 2.5mm;
      background: linear-gradient(90deg, #dc2626 60%, #ef4444);
      flex-shrink: 0;
    }

    /* ── Print ─────────────────────────────────────── */
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .grid { padding: 0; }
      .single { min-height: unset; padding: 0; }
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
</body>
</html>`);
  win.document.close();
}

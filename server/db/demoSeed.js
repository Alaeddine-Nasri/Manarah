'use strict';

const db = require('./db');
const bcrypt = require('bcryptjs');

// ─── Name lists ───────────────────────────────────────────────────────────────
const MALE_FIRST = [
  'Mohamed', 'Ahmed', 'Yacine', 'Amine', 'Karim', 'Bilal', 'Rayan', 'Djamel',
  'Tarek', 'Samir', 'Hamid', 'Nabil', 'Omar', 'Sofiane', 'Walid', 'Lyes',
  'Reda', 'Adel', 'Hichem', 'Zakaria', 'Fares', 'Nassim', 'Mehdi', 'Anis',
];
const FEMALE_FIRST = [
  'Fatima', 'Amira', 'Sarah', 'Lina', 'Asma', 'Rania', 'Nour', 'Hana',
  'Meriem', 'Yasmine', 'Imane', 'Khaoula', 'Sabrina', 'Ryma', 'Sirine',
  'Narimene', 'Chaima', 'Houda', 'Feriel', 'Widad', 'Roukia', 'Dina',
  'Nesrine', 'Manar',
];
const LAST_NAMES = [
  'Benali', 'Meziane', 'Hadj', 'Ouali', 'Brahimi', 'Beloufa', 'Cherif',
  'Boudiaf', 'Mansouri', 'Belkacem', 'Rahmani', 'Khelil', 'Hamdi', 'Saadi',
  'Boutarfa', 'Aissaoui', 'Kaci', 'Ferhat', 'Khaldi', 'Djebbar', 'Messaoud',
  'Benkhedda', 'Larbi', 'Boukhari', 'Amraoui', 'Bessaih', 'Terki', 'Djaballah',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _rng = 12345;
function seededRng() {
  _rng ^= _rng << 13;
  _rng ^= _rng >> 17;
  _rng ^= _rng << 5;
  return ((_rng >>> 0) / 4294967296);
}
function pick(arr) { return arr[Math.floor(seededRng() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(seededRng() * (max - min + 1)); }
function randPhone(prefix) { return prefix + String(randInt(1000000, 9999999)); }
function randQr() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'QR';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(seededRng() * chars.length)];
  return s;
}
function randBirthDate() {
  const year = randInt(2002, 2010);
  return `${year}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`;
}
function randStatus() {
  const r = seededRng();
  return r < 0.92 ? 'active' : r < 0.97 ? 'suspended' : 'archived';
}
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function getMondayOfWeek(refDate) {
  const d = new Date(refDate);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}
function isoDatetime(dateStr, timeStr, extraMinutes = 0) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + extraMinutes;
  return `${dateStr} ${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}:00`;
}

// Attendance rate varies by week index:
// Weeks 0-3  → January  (~90%, good start of term)
// Weeks 4-7  → February (~86%, slight decline)
// Weeks 8-11 → March    (~77%, -13% vs January, visible dip)
// Week  12   → April    (~78%, still low)
function getAttendanceRate(wk) {
  if (wk < 4)  return 0.90 + (seededRng() * 0.04 - 0.02); // 88–92%
  if (wk < 8)  return 0.86 + (seededRng() * 0.04 - 0.02); // 84–88%
  if (wk < 12) return 0.77 + (seededRng() * 0.04 - 0.02); // 75–79%
  return        0.78 + (seededRng() * 0.02 - 0.01);         // 77–79%
}

// ─── Main seed function ───────────────────────────────────────────────────────
function seedDemoData(school_id) {
  _rng = 12345 + school_id;

  try { db.exec('ALTER TABLE school_users ADD COLUMN teacher_id INTEGER REFERENCES teachers(id)'); } catch (_) {}

  const today         = new Date().toISOString().slice(0, 10);
  const currentMonday = getMondayOfWeek(today);
  // 13 weeks total: covers from ~Jan 5 to Apr 2 (today)
  const NUM_WEEKS = 13;
  const weekStarts = Array.from({ length: NUM_WEEKS }, (_, i) =>
    addDays(currentMonday, -(NUM_WEEKS - 1 - i) * 7)
  );
  // Convenient named refs for payments & expenses
  const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12] = weekStarts;

  const seed = db.transaction(() => {

    // ── 0. Update school location ─────────────────────────────────────────────
    db.prepare('UPDATE schools SET location = ? WHERE id = ?')
      .run('Batna, Algérie', school_id);

    // ── 1. Wipe existing demo data ────────────────────────────────────────────
    db.prepare('DELETE FROM payroll_records WHERE school_id = ?').run(school_id);
    db.prepare('DELETE FROM notifications WHERE school_id = ?').run(school_id);
    db.prepare('DELETE FROM audit_logs WHERE school_id = ?').run(school_id);

    const sessionIds = db.prepare('SELECT id FROM sessions WHERE school_id = ?').all(school_id).map(r => r.id);
    if (sessionIds.length) {
      db.prepare(`DELETE FROM attendance WHERE session_id IN (${sessionIds.map(()=>'?').join(',')})`).run(...sessionIds);
    }
    db.prepare('DELETE FROM sessions WHERE school_id = ?').run(school_id);

    const studentIds = db.prepare('SELECT id FROM students WHERE school_id = ?').all(school_id).map(r => r.id);
    if (studentIds.length) {
      db.prepare(`DELETE FROM student_groups WHERE student_id IN (${studentIds.map(()=>'?').join(',')})`).run(...studentIds);
      db.prepare(`DELETE FROM payments WHERE student_id IN (${studentIds.map(()=>'?').join(',')})`).run(...studentIds);
    }
    db.prepare('DELETE FROM students WHERE school_id = ?').run(school_id);
    db.prepare('DELETE FROM expenses WHERE school_id = ?').run(school_id);

    const levelIds = db.prepare('SELECT id FROM levels WHERE school_id = ?').all(school_id).map(r => r.id);
    if (levelIds.length) {
      const yearIds = db.prepare(`SELECT id FROM years WHERE level_id IN (${levelIds.map(()=>'?').join(',')})`).all(...levelIds).map(r => r.id);
      if (yearIds.length) {
        db.prepare(`DELETE FROM groups WHERE year_id IN (${yearIds.map(()=>'?').join(',')})`).run(...yearIds);
        db.prepare(`DELETE FROM years WHERE id IN (${yearIds.map(()=>'?').join(',')})`).run(...yearIds);
      }
    }
    db.prepare('DELETE FROM levels WHERE school_id = ?').run(school_id);
    db.prepare('DELETE FROM modules WHERE school_id = ?').run(school_id);

    const teacherIds = db.prepare('SELECT id FROM teachers WHERE school_id = ?').all(school_id).map(r => r.id);
    if (teacherIds.length) {
      db.prepare(`DELETE FROM teacher_assignments WHERE teacher_id IN (${teacherIds.map(()=>'?').join(',')})`).run(...teacherIds);
      db.prepare(`DELETE FROM rate_overrides WHERE teacher_id IN (${teacherIds.map(()=>'?').join(',')})`).run(...teacherIds);
      db.prepare(`DELETE FROM school_users WHERE school_id = ? AND teacher_id IN (${teacherIds.map(()=>'?').join(',')})`).run(school_id, ...teacherIds);
    }
    db.prepare('DELETE FROM teachers WHERE school_id = ?').run(school_id);

    // ── 2. Levels & Years ─────────────────────────────────────────────────────
    const insertLevel = db.prepare('INSERT INTO levels (school_id, name, type) VALUES (?, ?, ?)');
    const insertYear  = db.prepare('INSERT INTO years (level_id, name) VALUES (?, ?)');

    const bacId = insertLevel.run(school_id, 'BAC', 'secondary').lastInsertRowid;
    const bemId = insertLevel.run(school_id, 'BEM', 'middle').lastInsertRowid;

    const y3asId = insertYear.run(bacId, '3ème AS Sciences').lastInsertRowid;
    const y2asId = insertYear.run(bacId, '2ème AS').lastInsertRowid;
    const y4amId = insertYear.run(bemId, '4ème AM').lastInsertRowid;
    const y3amId = insertYear.run(bemId, '3ème AM').lastInsertRowid;

    // ── 3. Modules ────────────────────────────────────────────────────────────
    const insertModule = db.prepare('INSERT INTO modules (school_id, name) VALUES (?, ?)');
    const modMaths    = insertModule.run(school_id, 'Mathématiques').lastInsertRowid;
    const modPhysiq   = insertModule.run(school_id, 'Physique-Chimie').lastInsertRowid;
    const modFrancais = insertModule.run(school_id, 'Français').lastInsertRowid;
    const modSciences = insertModule.run(school_id, 'Sciences Naturelles').lastInsertRowid;
    const modAnglais  = insertModule.run(school_id, 'Anglais').lastInsertRowid;

    // ── 4. Teachers ───────────────────────────────────────────────────────────
    const insertTeacher = db.prepare(
      'INSERT INTO teachers (school_id, name, email, phone, revenue_percentage) VALUES (?, ?, ?, ?, ?)'
    );
    const teacherDefs = [
      { name: 'Ahmed Benali',   email: 'ahmed.benali@demo.ma',   phone: '0550112233', pct: 75 },
      { name: 'Fatima Meziane', email: 'fatima.meziane@demo.ma', phone: '0661223344', pct: 70 },
      { name: 'Karim Hadj',     email: 'karim.hadj@demo.ma',     phone: '0770334455', pct: 70 },
      { name: 'Samira Ouali',   email: 'samira.ouali@demo.ma',   phone: '0551445566', pct: 75 },
      { name: 'Youcef Brahimi', email: 'youcef.brahimi@demo.ma', phone: '0662556677', pct: 70 },
    ];
    const createdTeachers = [];
    for (const t of teacherDefs) {
      const id = insertTeacher.run(school_id, t.name, t.email, t.phone, t.pct).lastInsertRowid;
      createdTeachers.push({ id, ...t });
    }
    const [tAhmed, tFatima, tKarim, tSamira, tYoucef] = createdTeachers;

    // ── 5. Assignments ────────────────────────────────────────────────────────
    const insertAssign = db.prepare('INSERT INTO teacher_assignments (teacher_id, module_id) VALUES (?, ?)');
    insertAssign.run(tAhmed.id,  modMaths);
    insertAssign.run(tFatima.id, modPhysiq);
    insertAssign.run(tFatima.id, modMaths);
    insertAssign.run(tKarim.id,  modFrancais);
    insertAssign.run(tKarim.id,  modAnglais);
    insertAssign.run(tSamira.id, modMaths);
    insertAssign.run(tSamira.id, modSciences);
    insertAssign.run(tYoucef.id, modSciences);
    insertAssign.run(tYoucef.id, modAnglais);

    // ── 5b. Groups ────────────────────────────────────────────────────────────
    const insertGroup = db.prepare(
      'INSERT INTO groups (year_id, name, module_id, teacher_id) VALUES (?, ?, ?, ?)'
    );
    const g3asA = insertGroup.run(y3asId, 'Groupe A', modMaths,    tAhmed.id).lastInsertRowid;
    const g3asB = insertGroup.run(y3asId, 'Groupe B', modPhysiq,   tFatima.id).lastInsertRowid;
    const g2asA = insertGroup.run(y2asId, 'Groupe A', modAnglais,  tKarim.id).lastInsertRowid;
    const g4amA = insertGroup.run(y4amId, 'Groupe A', modSciences, tSamira.id).lastInsertRowid;
    const g3amA = insertGroup.run(y3amId, 'Groupe A', modSciences, tYoucef.id).lastInsertRowid;

    // ── 6. Teacher accounts ───────────────────────────────────────────────────
    const teacherPassword = bcrypt.hashSync('teacher123', 10);
    const insertUser      = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    const insertSchoolUser = db.prepare(
      'INSERT OR REPLACE INTO school_users (school_id, user_id, role, teacher_id) VALUES (?, ?, ?, ?)'
    );
    for (const teacher of createdTeachers) {
      let user = db.prepare('SELECT id FROM users WHERE email = ?').get(teacher.email);
      if (!user) {
        user = { id: insertUser.run(teacher.name, teacher.email, teacherPassword).lastInsertRowid };
      } else {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(teacherPassword, user.id);
      }
      insertSchoolUser.run(school_id, user.id, 'teacher', teacher.id);
    }

    // ── 7. Students ───────────────────────────────────────────────────────────
    const insertStudent = db.prepare(
      `INSERT INTO students (school_id, name, phone, parent_phone, birth_date, status, qr_code, level_id, year_id, group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertStudentGroup = db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)');
    const prefixes = ['0550', '0661', '0770'];
    const groupDefs = [
      { groupId: g3asA, levelId: bacId, yearId: y3asId, count: 14 },
      { groupId: g3asB, levelId: bacId, yearId: y3asId, count: 12 },
      { groupId: g2asA, levelId: bacId, yearId: y2asId, count: 11 },
      { groupId: g4amA, levelId: bemId, yearId: y4amId, count: 13 },
      { groupId: g3amA, levelId: bemId, yearId: y3amId, count: 10 },
    ];
    const studentsByGroup = {};
    for (const { groupId } of groupDefs) studentsByGroup[groupId] = [];
    const usedQrs = new Set();

    for (const { groupId, levelId, yearId, count } of groupDefs) {
      for (let i = 0; i < count; i++) {
        const isMale = seededRng() < 0.55;
        const name   = `${isMale ? pick(MALE_FIRST) : pick(FEMALE_FIRST)} ${pick(LAST_NAMES)}`;
        const p1 = randInt(0,2), p2 = (p1 + randInt(1,2)) % 3;
        let qr = randQr();
        while (usedQrs.has(qr)) qr = randQr();
        usedQrs.add(qr);
        const sid = insertStudent.run(
          school_id, name, randPhone(prefixes[p1]), randPhone(prefixes[p2]),
          randBirthDate(), randStatus(), qr, levelId, yearId, groupId
        ).lastInsertRowid;
        insertStudentGroup.run(sid, groupId);
        studentsByGroup[groupId].push(sid);
      }
    }

    // ── 8. Sessions & Attendance — 13 weeks ───────────────────────────────────
    const SLOTS = [
      { slot: 1, start: '08:00', end: '09:30' },
      { slot: 2, start: '10:00', end: '11:30' },
      { slot: 3, start: '14:00', end: '15:30' },
      { slot: 4, start: '16:00', end: '17:30' },
    ];
    const schedule = [
      // Monday
      { dayOff: 0, slot: 1, teacher: tAhmed,  module: modMaths,    group: g3asA },
      { dayOff: 0, slot: 1, teacher: tFatima, module: modPhysiq,   group: g3asB },
      { dayOff: 0, slot: 2, teacher: tFatima, module: modPhysiq,   group: g3asB },
      { dayOff: 0, slot: 3, teacher: tKarim,  module: modFrancais, group: g3asA },
      { dayOff: 0, slot: 3, teacher: tYoucef, module: modSciences, group: g2asA },
      { dayOff: 0, slot: 4, teacher: tSamira, module: modMaths,    group: g4amA },
      // Tuesday
      { dayOff: 1, slot: 1, teacher: tAhmed,  module: modMaths,    group: g3asB },
      { dayOff: 1, slot: 2, teacher: tFatima, module: modPhysiq,   group: g3asA },
      { dayOff: 1, slot: 2, teacher: tKarim,  module: modFrancais, group: g4amA },
      { dayOff: 1, slot: 3, teacher: tYoucef, module: modSciences, group: g3amA },
      { dayOff: 1, slot: 4, teacher: tKarim,  module: modAnglais,  group: g2asA },
      // Wednesday
      { dayOff: 2, slot: 1, teacher: tSamira, module: modSciences, group: g4amA },
      { dayOff: 2, slot: 1, teacher: tAhmed,  module: modMaths,    group: g2asA },
      { dayOff: 2, slot: 2, teacher: tAhmed,  module: modMaths,    group: g2asA },
      { dayOff: 2, slot: 3, teacher: tKarim,  module: modFrancais, group: g4amA },
      { dayOff: 2, slot: 4, teacher: tYoucef, module: modAnglais,  group: g3asB },
      // Thursday
      { dayOff: 3, slot: 1, teacher: tFatima, module: modMaths,    group: g3asA },
      { dayOff: 3, slot: 2, teacher: tSamira, module: modMaths,    group: g3amA },
      { dayOff: 3, slot: 2, teacher: tAhmed,  module: modMaths,    group: g3asB },
      { dayOff: 3, slot: 3, teacher: tAhmed,  module: modMaths,    group: g3asB },
      { dayOff: 3, slot: 4, teacher: tYoucef, module: modSciences, group: g3amA },
    ];

    const insertSession = db.prepare(
      `INSERT INTO sessions (school_id, teacher_id, module_id, group_id, date, start_time, end_time, type, attendance_open, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'one_time', ?, ?)`
    );
    const insertAttendance = db.prepare(
      `INSERT OR IGNORE INTO attendance (session_id, student_id, status, scanned_at) VALUES (?, ?, ?, ?)`
    );

    const attendedCount = {};

    for (let wk = 0; wk < NUM_WEEKS; wk++) {
      const wkStart = weekStarts[wk];
      const rate    = getAttendanceRate(wk);

      for (const entry of schedule) {
        const sessionDate    = addDays(wkStart, entry.dayOff);
        const slotInfo       = SLOTS[entry.slot - 1];
        const isFuture       = sessionDate > today;
        const shouldAttend   = !isFuture && (wk < NUM_WEEKS - 1 || sessionDate <= today);

        const sid = insertSession.run(
          school_id, entry.teacher.id, entry.module, entry.group,
          sessionDate, slotInfo.start, slotInfo.end,
          0, isoDatetime(wkStart, '08:00')
        ).lastInsertRowid;

        if (shouldAttend) {
          for (const studentId of studentsByGroup[entry.group] || []) {
            const present  = seededRng() < rate;
            const scanned  = present ? isoDatetime(sessionDate, slotInfo.start, randInt(0, 20)) : null;
            insertAttendance.run(sid, studentId, present ? 'present' : 'absent', scanned);
            if (present) {
              if (!attendedCount[studentId]) attendedCount[studentId] = {};
              attendedCount[studentId][entry.module] = (attendedCount[studentId][entry.module] || 0) + 1;
            }
          }
        }
      }
    }

    // ── 9. Payments — monthly per student (Jan, Feb, Mar) ────────────────────
    const groupPrimaryModule = {
      [g3asA]: { moduleId: modMaths,    teacherId: tAhmed.id,  pct: tAhmed.pct,  price: 3000 },
      [g3asB]: { moduleId: modMaths,    teacherId: tAhmed.id,  pct: tAhmed.pct,  price: 3000 },
      [g2asA]: { moduleId: modAnglais,  teacherId: tKarim.id,  pct: tKarim.pct,  price: 2500 },
      [g4amA]: { moduleId: modSciences, teacherId: tSamira.id, pct: tSamira.pct, price: 2500 },
      [g3amA]: { moduleId: modSciences, teacherId: tYoucef.id, pct: tYoucef.pct, price: 2500 },
    };

    const insertPayment = db.prepare(
      `INSERT INTO payments (school_id, student_id, teacher_id, module_id, amount, teacher_amount, school_amount, type, sessions_count, sessions_paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pack', ?, ?, ?)`
    );

    // Monthly payment windows (1st week of each month)
    const payMonths = [
      { label: 'jan',  date: isoDatetime(w0, '09:00') },  // week 0 ≈ early Jan
      { label: 'feb',  date: isoDatetime(w4, '09:00') },  // week 4 ≈ early Feb
      { label: 'mar',  date: isoDatetime(w8, '09:00') },  // week 8 ≈ early Mar
    ];

    for (const { groupId } of groupDefs) {
      const students = studentsByGroup[groupId] || [];
      const pm = groupPrimaryModule[groupId];
      if (!pm) continue;

      for (const studentId of students) {
        // Each student pays for each month; ~10% skip March (late payers)
        const skipMarch = seededRng() < 0.10;

        for (const { label, date } of payMonths) {
          if (label === 'mar' && skipMarch) continue;

          // Small random variation in payment date (±3 days)
          const dayOffset = randInt(0, 5);
          const payDate   = isoDatetime(addDays(date.slice(0,10), dayOffset), '09:00');

          const amount        = pm.price;
          const teacherAmount = Math.round(amount * pm.pct / 100);
          const schoolAmount  = amount - teacherAmount;
          const sessionsCount = 8; // sessions per month pack

          insertPayment.run(
            school_id, studentId, pm.teacherId, pm.moduleId,
            amount, teacherAmount, schoolAmount,
            sessionsCount, sessionsCount, payDate
          );
        }
      }
    }

    // ── 10. Expenses — spread across Jan → Apr ────────────────────────────────
    const insertExpense = db.prepare(
      `INSERT INTO expenses (school_id, category, description, amount, date) VALUES (?, ?, ?, ?, ?)`
    );
    // January
    insertExpense.run(school_id, 'rent',     'Loyer mensuel — Janvier',         55000, addDays(w0, 0));
    insertExpense.run(school_id, 'bills',    'Facture électricité — Janvier',     6200, addDays(w1, 1));
    insertExpense.run(school_id, 'supplies', 'Fournitures scolaires',             9500, addDays(w1, 3));
    insertExpense.run(school_id, 'other',    'Achat tableau interactif',         35000, addDays(w2, 2));
    // February
    insertExpense.run(school_id, 'rent',     'Loyer mensuel — Février',         55000, addDays(w4, 0));
    insertExpense.run(school_id, 'bills',    'Facture internet',                   3800, addDays(w4, 3));
    insertExpense.run(school_id, 'bills',    'Facture électricité — Février',     7100, addDays(w5, 1));
    insertExpense.run(school_id, 'supplies', 'Imprimante + cartouches',          14000, addDays(w6, 2));
    // March
    insertExpense.run(school_id, 'rent',     'Loyer mensuel — Mars',            55000, addDays(w8, 0));
    insertExpense.run(school_id, 'bills',    'Facture gaz & eau',                 4500, addDays(w9, 1));
    insertExpense.run(school_id, 'other',    'Maintenance climatiseurs',          8500, addDays(w10, 2));
    insertExpense.run(school_id, 'supplies', 'Tableaux blancs & marqueurs',       3200, addDays(w11, 3));
    // April
    insertExpense.run(school_id, 'rent',     'Loyer mensuel — Avril',           55000, addDays(w12, 0));
    insertExpense.run(school_id, 'bills',    'Facture électricité — Avril',       5800, addDays(w12, 2));

    // ── 11. Reset TEACHER account passwords only (not admin/staff) ───────────
    const defaultHash   = bcrypt.hashSync('teacher123', 10);
    const teacherUserIds = db.prepare(
      "SELECT user_id FROM school_users WHERE school_id = ? AND role = 'teacher'"
    ).all(school_id).map(r => r.user_id);
    if (teacherUserIds.length) {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id IN (${teacherUserIds.map(()=>'?').join(',')})`).run(defaultHash, ...teacherUserIds);
    }

  }); // end transaction

  seed();
}

module.exports = { seedDemoData };

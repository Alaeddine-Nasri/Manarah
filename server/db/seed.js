/**
 * Manarah realistic seed — Algerian school example data.
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   node db/seed.js
 *   node db/seed.js "My School" SCH001 admin@school.com admin123 "Admin Name"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

// ─────────────────────────────────────────────────────────────
// Seeded deterministic RNG — same output on every run
// ─────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}
const rng = makeRng(12345);
const rngInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
const rngPick = (arr) => arr[Math.floor(rng() * arr.length)];
const rngBool = (pct = 0.8) => rng() < pct; // true pct% of the time

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// get-or-create helpers
// ─────────────────────────────────────────────────────────────
function getOrCreate(selectStmt, insertFn) {
  const row = selectStmt();
  if (row) return row;
  return insertFn();
}

function gcLevel(schoolId, name, type) {
  return getOrCreate(
    () => db.prepare('SELECT * FROM levels WHERE school_id = ? AND name = ?').get(schoolId, name),
    () => {
      const r = db.prepare('INSERT INTO levels (school_id, name, type) VALUES (?, ?, ?)').run(schoolId, name, type);
      return { id: r.lastInsertRowid, school_id: schoolId, name, type };
    }
  );
}

function gcYear(levelId, name) {
  return getOrCreate(
    () => db.prepare('SELECT * FROM years WHERE level_id = ? AND name = ?').get(levelId, name),
    () => {
      const r = db.prepare('INSERT INTO years (level_id, name) VALUES (?, ?)').run(levelId, name);
      return { id: r.lastInsertRowid, level_id: levelId, name };
    }
  );
}

function gcGroup(yearId, name) {
  return getOrCreate(
    () => db.prepare('SELECT * FROM groups WHERE year_id = ? AND name = ?').get(yearId, name),
    () => {
      const r = db.prepare('INSERT INTO groups (year_id, name) VALUES (?, ?)').run(yearId, name);
      return { id: r.lastInsertRowid, year_id: yearId, name };
    }
  );
}

function gcModule(schoolId, name) {
  return getOrCreate(
    () => db.prepare('SELECT * FROM modules WHERE school_id = ? AND name = ?').get(schoolId, name),
    () => {
      const r = db.prepare('INSERT INTO modules (school_id, name) VALUES (?, ?)').run(schoolId, name);
      return { id: r.lastInsertRowid, school_id: schoolId, name };
    }
  );
}

function gcTeacher(schoolId, name, email, phone, defaultRate) {
  return getOrCreate(
    () => db.prepare('SELECT * FROM teachers WHERE school_id = ? AND name = ?').get(schoolId, name),
    () => {
      const r = db.prepare(
        'INSERT INTO teachers (school_id, name, email, phone, default_rate) VALUES (?, ?, ?, ?, ?)'
      ).run(schoolId, name, email, phone, defaultRate);
      return { id: r.lastInsertRowid, school_id: schoolId, name, email, phone, default_rate: defaultRate };
    }
  );
}

function gcAssignment(teacherId, moduleId) {
  const existing = db.prepare(
    'SELECT * FROM teacher_assignments WHERE teacher_id = ? AND module_id = ?'
  ).get(teacherId, moduleId);
  if (!existing) {
    db.prepare('INSERT INTO teacher_assignments (teacher_id, module_id) VALUES (?, ?)').run(teacherId, moduleId);
  }
}

// ─────────────────────────────────────────────────────────────
// 0. School + admin
// ─────────────────────────────────────────────────────────────
const schoolName = process.argv[2] || 'École Manarah';
const schoolCode = process.argv[3] || 'MANARAH';
const adminEmail = process.argv[4] || 'admin@manarah.com';
const adminPass  = process.argv[5] || 'admin123';
const adminName  = process.argv[6] || 'Admin';

const school = getOrCreate(
  () => db.prepare('SELECT * FROM schools WHERE code = ?').get(schoolCode),
  () => {
    const r = db.prepare('INSERT INTO schools (name, code) VALUES (?, ?)').run(schoolName, schoolCode);
    console.log(`  School created → [${schoolCode}] ${schoolName}`);
    return { id: r.lastInsertRowid, name: schoolName, code: schoolCode };
  }
);
console.log(`School: [${school.code}] ${school.name}  (id=${school.id})`);
const S = school.id;

const user = getOrCreate(
  () => db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail),
  () => {
    const hash = bcrypt.hashSync(adminPass, 10);
    const r = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(adminName, adminEmail, hash);
    console.log(`  User created → ${adminEmail} / ${adminPass}`);
    return { id: r.lastInsertRowid, email: adminEmail, name: adminName };
  }
);
getOrCreate(
  () => db.prepare('SELECT * FROM school_users WHERE school_id = ? AND user_id = ?').get(S, user.id),
  () => {
    db.prepare('INSERT INTO school_users (school_id, user_id, role) VALUES (?, ?, ?)').run(S, user.id, 'admin');
    return { linked: true };
  }
);
console.log(`Admin: ${user.email}`);

// ─────────────────────────────────────────────────────────────
// 1. Academic structure
// ─────────────────────────────────────────────────────────────
console.log('\n── Structure ──');

const LVL = {
  primaire: gcLevel(S, 'Primaire', 'primary'),
  moyen:    gcLevel(S, 'Moyen',    'middle'),
  lycee:    gcLevel(S, 'Lycée',    'secondary'),
  atelier:  gcLevel(S, 'Atelier',  'workshop'),
};

const YEAR_NAMES_P = ['1ère', '2ème', '3ème', '4ème', '5ème'];
const YEAR_NAMES_M = ['1ère', '2ème', '3ème', '4ème'];
const YEAR_NAMES_L = ['1ère', '2ème', '3ème'];

const YEARS = { primaire: {}, moyen: {}, lycee: {}, atelier: {} };
for (const n of YEAR_NAMES_P) YEARS.primaire[n] = gcYear(LVL.primaire.id, n);
for (const n of YEAR_NAMES_M) YEARS.moyen[n]    = gcYear(LVL.moyen.id,    n);
for (const n of YEAR_NAMES_L) YEARS.lycee[n]    = gcYear(LVL.lycee.id,    n);
YEARS.atelier['Dessin']  = gcYear(LVL.atelier.id, 'Dessin');
YEARS.atelier['Musique'] = gcYear(LVL.atelier.id, 'Musique');

// Groups: A and B for each year
const GROUPS = {};
function groupKey(yearId, name) { return `${yearId}_${name}`; }
function ensureGroups(yearsMap) {
  for (const [, yr] of Object.entries(yearsMap)) {
    GROUPS[groupKey(yr.id, 'A')] = gcGroup(yr.id, 'A');
    GROUPS[groupKey(yr.id, 'B')] = gcGroup(yr.id, 'B');
  }
}
ensureGroups(YEARS.primaire);
ensureGroups(YEARS.moyen);
ensureGroups(YEARS.lycee);
// Atelier: single group A each
GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')] = gcGroup(YEARS.atelier['Dessin'].id,  'A');
GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')] = gcGroup(YEARS.atelier['Musique'].id, 'A');

const levelCount = Object.keys(LVL).length;
const yearCount  = Object.values(YEARS).reduce((s, m) => s + Object.keys(m).length, 0);
const groupCount = Object.keys(GROUPS).length;
console.log(`  Levels: ${levelCount}, Years: ${yearCount}, Groups: ${groupCount}`);

// ─────────────────────────────────────────────────────────────
// 2. Modules
// ─────────────────────────────────────────────────────────────
console.log('\n── Modules ──');
const MOD = {};
const moduleNames = [
  'Mathématiques', 'Physique', 'Chimie', 'Sciences naturelles',
  'Langue arabe', 'Langue française', 'Langue anglaise',
  'Histoire-Géographie', 'Éducation islamique', 'Philosophie',
  'Informatique', 'Tamazight', 'Éducation civique',
];
for (const name of moduleNames) {
  MOD[name] = gcModule(S, name);
}
console.log(`  ${Object.keys(MOD).length} modules ready`);

// ─────────────────────────────────────────────────────────────
// 3. Teachers + assignments
// ─────────────────────────────────────────────────────────────
console.log('\n── Teachers ──');
const teacherDefs = [
  { name: 'Youcef Benali',    email: 'y.benali@manarah.dz',    phone: '0550110001', rate: 700, modules: ['Mathématiques', 'Physique'] },
  { name: 'Amira Hadj',       email: 'a.hadj@manarah.dz',      phone: '0550110002', rate: 500, modules: ['Langue arabe'] },
  { name: 'Karim Meziane',    email: 'k.meziane@manarah.dz',   phone: '0550110003', rate: 800, modules: ['Informatique'] },
  { name: 'Fatima Boudali',   email: 'f.boudali@manarah.dz',   phone: '0550110004', rate: 600, modules: ['Langue française'] },
  { name: 'Mohamed Khelifi',  email: 'm.khelifi@manarah.dz',   phone: '0550110005', rate: 650, modules: ['Chimie', 'Sciences naturelles'] },
  { name: 'Nadia Aouiche',    email: 'n.aouiche@manarah.dz',   phone: '0550110006', rate: 550, modules: ['Langue anglaise'] },
  { name: 'Rachid Terki',     email: 'r.terki@manarah.dz',     phone: '0550110007', rate: 400, modules: ['Éducation islamique', 'Tamazight'] },
  { name: 'Soumia Larbi',     email: 's.larbi@manarah.dz',     phone: '0550110008', rate: 450, modules: ['Histoire-Géographie', 'Éducation civique'] },
  { name: 'Omar Ferhat',      email: 'o.ferhat@manarah.dz',    phone: '0550110009', rate: 350, modules: ['Éducation civique'] },
  { name: 'Djamila Chouicha', email: 'd.chouicha@manarah.dz',  phone: '0550110010', rate: 500, modules: ['Philosophie'] },
];

const TEACH = {};
for (const t of teacherDefs) {
  const teacher = gcTeacher(S, t.name, t.email, t.phone, t.rate);
  TEACH[t.name] = { ...teacher, modules: t.modules };
  for (const mName of t.modules) {
    gcAssignment(teacher.id, MOD[mName].id);
  }
}
console.log(`  ${Object.keys(TEACH).length} teachers ready`);

// ─────────────────────────────────────────────────────────────
// 4. Students (40)
// ─────────────────────────────────────────────────────────────
console.log('\n── Students ──');

function g(levelKey, yearName, groupName) {
  return GROUPS[groupKey(YEARS[levelKey][yearName].id, groupName)];
}

const studentDefs = [
  // Primaire 3ème A (3)
  { name: 'Amine Boudiaf',    levelId: LVL.primaire.id, yearId: YEARS.primaire['3ème'].id, groupId: g('primaire','3ème','A').id },
  { name: 'Rania Mebarki',    levelId: LVL.primaire.id, yearId: YEARS.primaire['3ème'].id, groupId: g('primaire','3ème','A').id },
  { name: 'Yassine Cherif',   levelId: LVL.primaire.id, yearId: YEARS.primaire['3ème'].id, groupId: g('primaire','3ème','A').id },
  // Primaire 4ème B (3)
  { name: 'Imane Ziani',      levelId: LVL.primaire.id, yearId: YEARS.primaire['4ème'].id, groupId: g('primaire','4ème','B').id },
  { name: 'Walid Bensalem',   levelId: LVL.primaire.id, yearId: YEARS.primaire['4ème'].id, groupId: g('primaire','4ème','B').id },
  { name: 'Meriem Hadj',      levelId: LVL.primaire.id, yearId: YEARS.primaire['4ème'].id, groupId: g('primaire','4ème','B').id },
  // Moyen 1ère A (5)
  { name: 'Ilyes Ouali',      levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','A').id },
  { name: 'Sara Mansouri',    levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','A').id },
  { name: 'Hamza Boukhalfa',  levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','A').id },
  { name: 'Lina Fergani',     levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','A').id },
  { name: 'Ayoub Benali',     levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','A').id },
  // Moyen 1ère B (4)
  { name: 'Nour Khelifi',     levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','B').id },
  { name: 'Bilal Boudali',    levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','B').id },
  { name: 'Asma Meziane',     levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','B').id },
  { name: 'Zakaria Aouiche',  levelId: LVL.moyen.id, yearId: YEARS.moyen['1ère'].id, groupId: g('moyen','1ère','B').id },
  // Moyen 2ème A (4)
  { name: 'Hajar Larbi',      levelId: LVL.moyen.id, yearId: YEARS.moyen['2ème'].id, groupId: g('moyen','2ème','A').id },
  { name: 'Nassim Terki',     levelId: LVL.moyen.id, yearId: YEARS.moyen['2ème'].id, groupId: g('moyen','2ème','A').id },
  { name: 'Yasmine Ferhat',   levelId: LVL.moyen.id, yearId: YEARS.moyen['2ème'].id, groupId: g('moyen','2ème','A').id },
  { name: 'Rayane Chouicha',  levelId: LVL.moyen.id, yearId: YEARS.moyen['2ème'].id, groupId: g('moyen','2ème','A').id },
  // Lycée 1ère A (5)
  { name: 'Dounia Bouzid',    levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','A').id },
  { name: 'Adem Ouali',       levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','A').id },
  { name: 'Rima Fergani',     levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','A').id },
  { name: 'Sofiane Mansouri', levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','A').id },
  { name: 'Cylia Ziani',      levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','A').id },
  // Lycée 1ère B (4)
  { name: 'Hichem Bensalem',  levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','B').id },
  { name: 'Amira Boudiaf',    levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','B').id },
  { name: 'Sami Boukhalfa',   levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','B').id },
  { name: 'Sabrina Khelifi',  levelId: LVL.lycee.id, yearId: YEARS.lycee['1ère'].id, groupId: g('lycee','1ère','B').id },
  // Lycée 2ème A (4)
  { name: 'Ryad Cherif',      levelId: LVL.lycee.id, yearId: YEARS.lycee['2ème'].id, groupId: g('lycee','2ème','A').id },
  { name: 'Nawel Hadj',       levelId: LVL.lycee.id, yearId: YEARS.lycee['2ème'].id, groupId: g('lycee','2ème','A').id },
  { name: 'Nassim Aouiche',   levelId: LVL.lycee.id, yearId: YEARS.lycee['2ème'].id, groupId: g('lycee','2ème','A').id },
  { name: 'Yasmine Larbi',    levelId: LVL.lycee.id, yearId: YEARS.lycee['2ème'].id, groupId: g('lycee','2ème','A').id },
  // Atelier Dessin A (4)
  { name: 'Malek Terki',      levelId: LVL.atelier.id, yearId: YEARS.atelier['Dessin'].id,  groupId: GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')].id },
  { name: 'Lyna Ferhat',      levelId: LVL.atelier.id, yearId: YEARS.atelier['Dessin'].id,  groupId: GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')].id },
  { name: 'Karim Chouicha',   levelId: LVL.atelier.id, yearId: YEARS.atelier['Dessin'].id,  groupId: GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')].id },
  { name: 'Nour Bouzid',      levelId: LVL.atelier.id, yearId: YEARS.atelier['Dessin'].id,  groupId: GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')].id },
  // Atelier Musique A (4)
  { name: 'Bilal Mebarki',    levelId: LVL.atelier.id, yearId: YEARS.atelier['Musique'].id, groupId: GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')].id },
  { name: 'Asma Benali',      levelId: LVL.atelier.id, yearId: YEARS.atelier['Musique'].id, groupId: GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')].id },
  { name: 'Ryad Meziane',     levelId: LVL.atelier.id, yearId: YEARS.atelier['Musique'].id, groupId: GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')].id },
  { name: 'Dounia Bensalem',  levelId: LVL.atelier.id, yearId: YEARS.atelier['Musique'].id, groupId: GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')].id },
];

const insertStudent = db.prepare(`
  INSERT OR IGNORE INTO students
    (school_id, name, level_id, year_id, group_id, status, qr_code)
  VALUES (?, ?, ?, ?, ?, 'active', ?)
`);

const STUDENTS = [];
let insertedStudents = 0;
for (let i = 0; i < studentDefs.length; i++) {
  const s = studentDefs[i];
  const slug = s.name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[ôó]/g, 'o').replace(/[îï]/g, 'i')
    .replace(/[û]/g, 'u').replace(/ç/g, 'c');
  const qr = `${slug}-${String(i + 1).padStart(3, '0')}`;

  const existing = db.prepare('SELECT * FROM students WHERE qr_code = ?').get(qr);
  if (existing) {
    STUDENTS.push(existing);
  } else {
    const r = insertStudent.run(S, s.name, s.levelId, s.yearId, s.groupId, qr);
    STUDENTS.push({ id: r.lastInsertRowid, ...s, qr_code: qr });
    insertedStudents++;
  }
}
console.log(`  ${studentDefs.length} students ready (${insertedStudents} new)`);

// ─────────────────────────────────────────────────────────────
// 5. Sessions + attendance
// ─────────────────────────────────────────────────────────────
console.log('\n── Sessions ──');

const existingSessions = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE school_id = ?').get(S).c;
if (existingSessions > 0) {
  console.log(`  Sessions already seeded (${existingSessions} found) — skipping`);
} else {
  // Helper shortcuts
  const moyenG = (yearName, grp) => g('moyen', yearName, grp);
  const lyceeG  = (yearName, grp) => g('lycee',  yearName, grp);

  const T = TEACH; // alias
  const M = MOD;

  // Session plan: { teacher, module, group, date, start, end, isPast }
  const sessionPlan = [
    // ── Past sessions (9) — last 2 weeks ──
    { teacher: T['Youcef Benali'],   mod: M['Mathématiques'],   group: moyenG('1ère','A'), date: daysAgo(13), start: '09:00', end: '10:30', isPast: true },
    { teacher: T['Fatima Boudali'],  mod: M['Langue française'], group: moyenG('1ère','B'), date: daysAgo(12), start: '10:00', end: '11:30', isPast: true },
    { teacher: T['Nadia Aouiche'],   mod: M['Langue anglaise'],  group: lyceeG('1ère','A'), date: daysAgo(11), start: '08:30', end: '10:00', isPast: true },
    { teacher: T['Youcef Benali'],   mod: M['Mathématiques'],   group: lyceeG('1ère','B'), date: daysAgo(10), start: '14:00', end: '15:30', isPast: true },
    { teacher: T['Mohamed Khelifi'], mod: M['Chimie'],           group: moyenG('2ème','A'), date: daysAgo(9),  start: '11:00', end: '12:00', isPast: true },
    { teacher: T['Amira Hadj'],      mod: M['Langue arabe'],     group: moyenG('1ère','A'), date: daysAgo(7),  start: '09:00', end: '10:00', isPast: true },
    { teacher: T['Youcef Benali'],   mod: M['Mathématiques'],   group: moyenG('1ère','A'), date: daysAgo(6),  start: '09:00', end: '10:30', isPast: true },
    { teacher: T['Fatima Boudali'],  mod: M['Langue française'], group: lyceeG('2ème','A'), date: daysAgo(5),  start: '10:00', end: '11:30', isPast: true },
    { teacher: T['Nadia Aouiche'],   mod: M['Langue anglaise'],  group: lyceeG('1ère','B'), date: daysAgo(3),  start: '15:00', end: '16:30', isPast: true },
    // ── Upcoming sessions (3) ──
    { teacher: T['Youcef Benali'],   mod: M['Mathématiques'],   group: moyenG('1ère','A'), date: daysAhead(1), start: '09:00', end: '10:30', isPast: false },
    { teacher: T['Nadia Aouiche'],   mod: M['Langue anglaise'],  group: lyceeG('1ère','A'), date: daysAhead(2), start: '08:30', end: '10:00', isPast: false },
    { teacher: T['Fatima Boudali'],  mod: M['Langue française'], group: moyenG('1ère','B'), date: daysAhead(3), start: '10:00', end: '11:30', isPast: false },
  ];

  const insertSession = db.prepare(`
    INSERT INTO sessions (school_id, teacher_id, module_id, group_id, date, start_time, end_time, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'one_time')
  `);
  const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance (session_id, student_id, status, scanned_at)
    VALUES (?, ?, ?, ?)
  `);

  let totalAttendance = 0;

  for (const sp of sessionPlan) {
    const r = insertSession.run(S, sp.teacher.id, sp.mod.id, sp.group.id, sp.date, sp.start, sp.end);
    const sessionId = r.lastInsertRowid;

    if (sp.isPast) {
      // Find students in this group and mark attendance
      const groupStudents = db.prepare(
        'SELECT id FROM students WHERE school_id = ? AND group_id = ?'
      ).all(S, sp.group.id);

      for (const st of groupStudents) {
        const present = rngBool(0.82); // 82% attendance rate
        const scanned = present
          ? `${sp.date} ${sp.start.slice(0, 2)}:${rngInt(0, 20).toString().padStart(2, '0')}:00`
          : null;
        insertAttendance.run(sessionId, st.id, present ? 'present' : 'absent', scanned);
        totalAttendance++;
      }
    }
  }

  console.log(`  ${sessionPlan.length} sessions created (${sessionPlan.filter(s => s.isPast).length} past, ${sessionPlan.filter(s => !s.isPast).length} upcoming)`);
  console.log(`  ${totalAttendance} attendance records created`);
}

// ─────────────────────────────────────────────────────────────
// 6. Payments
// ─────────────────────────────────────────────────────────────
console.log('\n── Payments ──');

const existingPayments = db.prepare('SELECT COUNT(*) as c FROM payments WHERE school_id = ?').get(S).c;
if (existingPayments > 0) {
  console.log(`  Payments already seeded (${existingPayments} found) — skipping`);
} else {
  // Map: which teacher+module to use per student (based on their group)
  const M1A = g('moyen','1ère','A').id;
  const M1B = g('moyen','1ère','B').id;
  const M2A = g('moyen','2ème','A').id;
  const L1A = g('lycee','1ère','A').id;
  const L1B = g('lycee','1ère','B').id;
  const L2A = g('lycee','2ème','A').id;
  const P3A = g('primaire','3ème','A').id;
  const P4B = g('primaire','4ème','B').id;
  const ATD = GROUPS[groupKey(YEARS.atelier['Dessin'].id,  'A')].id;
  const ATM = GROUPS[groupKey(YEARS.atelier['Musique'].id, 'A')].id;

  const groupPaymentConfig = {
    [M1A]: { teacher: TEACH['Youcef Benali'],   mod: MOD['Mathématiques'] },
    [M1B]: { teacher: TEACH['Fatima Boudali'],  mod: MOD['Langue française'] },
    [M2A]: { teacher: TEACH['Mohamed Khelifi'], mod: MOD['Chimie'] },
    [L1A]: { teacher: TEACH['Nadia Aouiche'],   mod: MOD['Langue anglaise'] },
    [L1B]: { teacher: TEACH['Nadia Aouiche'],   mod: MOD['Langue anglaise'] },
    [L2A]: { teacher: TEACH['Youcef Benali'],   mod: MOD['Physique'] },
    [P3A]: { teacher: TEACH['Amira Hadj'],      mod: MOD['Langue arabe'] },
    [P4B]: { teacher: TEACH['Fatima Boudali'],  mod: MOD['Langue française'] },
    [ATD]: { teacher: TEACH['Rachid Terki'],    mod: MOD['Éducation islamique'] },
    [ATM]: { teacher: TEACH['Rachid Terki'],    mod: MOD['Tamazight'] },
  };

  const insertPayment = db.prepare(`
    INSERT INTO payments
      (school_id, student_id, teacher_id, module_id, amount, teacher_amount, school_amount, type, sessions_count, sessions_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pack', 4, ?)
  `);

  let paymentCount = 0;
  for (const student of STUDENTS) {
    const cfg = groupPaymentConfig[student.groupId || student.group_id];
    if (!cfg) continue;

    // 1 or 2 payments per student
    const numPayments = rngBool(0.55) ? 2 : 1;
    for (let p = 0; p < numPayments; p++) {
      const rate = cfg.teacher.default_rate;
      const sessions_count = 4;
      const teacher_amount = rate * sessions_count;
      const school_markup = rngInt(200, 600);
      const amount = teacher_amount + school_markup;
      const school_amount = amount - teacher_amount;
      const sessions_paid = rngInt(0, sessions_count);

      insertPayment.run(
        S,
        student.id,
        cfg.teacher.id,
        cfg.mod.id,
        amount,
        teacher_amount,
        school_amount,
        sessions_paid
      );
      paymentCount++;
    }
  }
  console.log(`  ${paymentCount} payments created`);
}

// ─────────────────────────────────────────────────────────────
// Done
// ─────────────────────────────────────────────────────────────
console.log('\n✓ Seed complete');
const counts = {
  levels:   db.prepare('SELECT COUNT(*) as c FROM levels   WHERE school_id = ?').get(S).c,
  modules:  db.prepare('SELECT COUNT(*) as c FROM modules  WHERE school_id = ?').get(S).c,
  teachers: db.prepare('SELECT COUNT(*) as c FROM teachers WHERE school_id = ?').get(S).c,
  students: db.prepare('SELECT COUNT(*) as c FROM students WHERE school_id = ?').get(S).c,
  sessions: db.prepare('SELECT COUNT(*) as c FROM sessions WHERE school_id = ?').get(S).c,
  payments: db.prepare('SELECT COUNT(*) as c FROM payments WHERE school_id = ?').get(S).c,
  attendance: db.prepare('SELECT COUNT(*) as c FROM attendance a JOIN sessions s ON a.session_id = s.id WHERE s.school_id = ?').get(S).c,
};
console.log(JSON.stringify(counts, null, 2));

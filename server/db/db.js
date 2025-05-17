const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Fallback is relative to the server root (one level up from db/), not the workspace root
// On Render: mount a persistent disk at /data and it just works
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../manarah.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// run schema (all tables use IF NOT EXISTS so this is safe on restarts)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Feature: Teacher portal — add teacher_id column to school_users if not present
try {
  db.exec('ALTER TABLE school_users ADD COLUMN teacher_id INTEGER REFERENCES teachers(id)');
} catch (_) { /* column already exists — safe to ignore */ }

// Feature: 'teacher' role — expand CHECK constraint on school_users
try {
  const tableSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='school_users'").get()?.sql || '';
  if (!tableSQL.includes("'teacher'")) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      CREATE TABLE school_users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','staff','teacher')),
        teacher_id INTEGER REFERENCES teachers(id),
        UNIQUE(school_id, user_id)
      );
      INSERT INTO school_users_new SELECT * FROM school_users;
      DROP TABLE school_users;
      ALTER TABLE school_users_new RENAME TO school_users;
      UPDATE school_users SET role='teacher' WHERE teacher_id IS NOT NULL AND role='staff';
      PRAGMA foreign_keys=ON;
    `);
  }
} catch (_) { /* migration failed or already done */ }

// Feature: Groups linked to module + teacher
try {
  db.exec('ALTER TABLE groups ADD COLUMN module_id INTEGER REFERENCES modules(id)');
} catch (_) { /* column already exists */ }
try {
  db.exec('ALTER TABLE groups ADD COLUMN teacher_id INTEGER REFERENCES teachers(id)');
} catch (_) { /* column already exists */ }

// Feature: school location field
try {
  db.exec('ALTER TABLE schools ADD COLUMN location TEXT');
} catch (_) { /* already exists */ }

module.exports = db;

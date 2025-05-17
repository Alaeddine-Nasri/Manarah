const db = require('../db/db');

const Attendance = {
  findBySession(session_id) {
    return db.prepare(`
      SELECT a.*, s.name as student_name, s.qr_code
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.session_id = ?
    `).all(session_id);
  },

  findByStudent(student_id) {
    return db.prepare(`
      SELECT a.*, ss.date, ss.start_time, m.name as module_name
      FROM attendance a
      JOIN sessions ss ON a.session_id = ss.id
      JOIN modules m ON ss.module_id = m.id
      WHERE a.student_id = ?
      ORDER BY ss.date DESC
    `).all(student_id);
  },

  upsert(session_id, student_id, status, scanned_at = null) {
    return db.prepare(`
      INSERT INTO attendance (session_id, student_id, status, scanned_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, scanned_at=excluded.scanned_at
    `).run(session_id, student_id, status, scanned_at);
  },

  findOne(session_id, student_id) {
    return db.prepare('SELECT * FROM attendance WHERE session_id = ? AND student_id = ?').get(session_id, student_id);
  },

  // returns all students in a group with their attendance record (or null) for a given session
  getRoster(session_id, group_id) {
    return db.prepare(`
      SELECT s.id, s.name, s.qr_code,
             a.status, a.scanned_at
      FROM students s
      JOIN student_groups sg ON sg.student_id = s.id AND sg.group_id = ?
      LEFT JOIN attendance a ON a.session_id = ? AND a.student_id = s.id
      WHERE s.status = 'active'
      ORDER BY s.name
    `).all(group_id, session_id);
  },

  // bulk insert absent for all students in a group who haven't scanned yet
  markAbsent(session_id, student_ids) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO attendance (session_id, student_id, status)
      VALUES (?, ?, 'absent')
    `);
    const run = db.transaction((ids) => {
      for (const id of ids) insert.run(session_id, id);
    });
    run(student_ids);
  },
};

module.exports = Attendance;

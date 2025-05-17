const db = require('../db/db');

const PayrollRecord = {
  find(school_id, teacher_id, month) {
    return db.prepare(
      'SELECT * FROM payroll_records WHERE school_id = ? AND teacher_id = ? AND month = ?'
    ).get(school_id, teacher_id, month);
  },

  upsert(school_id, teacher_id, month) {
    return db.prepare(`
      INSERT INTO payroll_records (school_id, teacher_id, month)
      VALUES (?, ?, ?)
      ON CONFLICT(school_id, teacher_id, month) DO UPDATE SET marked_paid_at = CURRENT_TIMESTAMP
    `).run(school_id, teacher_id, month);
  },

  remove(school_id, teacher_id, month) {
    return db.prepare(
      'DELETE FROM payroll_records WHERE school_id = ? AND teacher_id = ? AND month = ?'
    ).run(school_id, teacher_id, month);
  },
};

module.exports = PayrollRecord;

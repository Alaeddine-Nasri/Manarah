const db = require('../db/db');

const Payment = {
  findAll(school_id, filters = {}) {
    let query = `
      SELECT p.*, s.name as student_name, t.name as teacher_name, m.name as module_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.school_id = ?
    `;
    const params = [school_id];
    if (filters.student_id) { query += ' AND p.student_id = ?'; params.push(filters.student_id); }
    if (filters.teacher_id) { query += ' AND p.teacher_id = ?'; params.push(filters.teacher_id); }
    if (filters.month)      { query += " AND strftime('%Y-%m', p.created_at) = ?"; params.push(filters.month); }
    query += ' ORDER BY p.created_at DESC';
    return db.prepare(query).all(...params);
  },

  getSummary(school_id, month) {
    return db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0)         as total_collected,
        COALESCE(SUM(teacher_amount), 0) as total_teacher,
        COALESCE(SUM(school_amount), 0)  as total_school
      FROM payments
      WHERE school_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(school_id, month);
  },

  findById(id, school_id) {
    return db.prepare(`
      SELECT p.*, s.name as student_name, t.name as teacher_name, m.name as module_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.id = ? AND p.school_id = ?
    `).get(id, school_id);
  },

  create(school_id, data) {
    return db.prepare(`
      INSERT INTO payments (school_id, student_id, teacher_id, module_id, amount, teacher_amount, school_amount, type, sessions_count, sessions_paid)
      VALUES (?, @student_id, @teacher_id, @module_id, @amount, @teacher_amount, @school_amount, @type, @sessions_count, @sessions_paid)
    `).run(school_id, data);
  },

  update(id, school_id, data) {
    return db.prepare(
      'UPDATE payments SET sessions_paid=@sessions_paid, amount=@amount WHERE id=@id AND school_id=@school_id'
    ).run({ ...data, id, school_id });
  },

  remove(id, school_id) {
    return db.prepare('DELETE FROM payments WHERE id = ? AND school_id = ?').run(id, school_id);
  },
};

module.exports = Payment;

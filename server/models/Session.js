const db = require('../db/db');

const Session = {
  findAll(school_id, filters = {}) {
    let query = `
      SELECT s.*, t.name as teacher_name, m.name as module_name, g.name as group_name
      FROM sessions s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN modules m ON s.module_id = m.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.school_id = ?
    `;
    const params = [school_id];
    if (filters.date)       { query += ' AND s.date = ?';       params.push(filters.date); }
    if (filters.teacher_id) { query += ' AND s.teacher_id = ?'; params.push(filters.teacher_id); }
    if (filters.group_id)   { query += ' AND s.group_id = ?';   params.push(filters.group_id); }
    query += ' ORDER BY s.date, s.start_time';
    return db.prepare(query).all(...params);
  },

  findByRange(school_id, start, end, filters = {}) {
    let query = `
      SELECT s.*, t.name as teacher_name, m.name as module_name, g.name as group_name
      FROM sessions s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN modules m ON s.module_id = m.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.school_id = ? AND s.date BETWEEN ? AND ?
    `;
    const params = [school_id, start, end];
    if (filters.teacher_id) { query += ' AND s.teacher_id = ?'; params.push(filters.teacher_id); }
    if (filters.group_id)   { query += ' AND s.group_id = ?';   params.push(filters.group_id); }
    query += ' ORDER BY s.date, s.start_time';
    return db.prepare(query).all(...params);
  },

  findById(id, school_id) {
    return db.prepare(`
      SELECT s.*, t.name as teacher_name, m.name as module_name, g.name as group_name
      FROM sessions s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN modules m ON s.module_id = m.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.id = ? AND s.school_id = ?
    `).get(id, school_id);
  },

  create(school_id, data) {
    return db.prepare(`
      INSERT INTO sessions (school_id, teacher_id, module_id, group_id, date, start_time, end_time, type, recurrence_group)
      VALUES (?, @teacher_id, @module_id, @group_id, @date, @start_time, @end_time, @type, @recurrence_group)
    `).run(school_id, data);
  },

  update(id, school_id, data) {
    return db.prepare(`
      UPDATE sessions
      SET teacher_id=@teacher_id, module_id=@module_id, group_id=@group_id,
          date=@date, start_time=@start_time, end_time=@end_time, attendance_open=@attendance_open
      WHERE id=@id AND school_id=@school_id
    `).run({ ...data, id, school_id });
  },

  remove(id, school_id) {
    return db.prepare('DELETE FROM sessions WHERE id = ? AND school_id = ?').run(id, school_id);
  },

  removeByRecurrenceGroup(recurrence_group, school_id) {
    return db.prepare('DELETE FROM sessions WHERE recurrence_group = ? AND school_id = ?').run(recurrence_group, school_id);
  },

  setAttendanceOpen(id, school_id, open) {
    return db.prepare('UPDATE sessions SET attendance_open = ? WHERE id = ? AND school_id = ?').run(open ? 1 : 0, id, school_id);
  },
};

module.exports = Session;

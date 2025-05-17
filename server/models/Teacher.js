const db = require('../db/db');

const Teacher = {
  findAll(school_id) {
    return db.prepare('SELECT * FROM teachers WHERE school_id = ? ORDER BY name').all(school_id);
  },

  findById(id, school_id) {
    return db.prepare('SELECT * FROM teachers WHERE id = ? AND school_id = ?').get(id, school_id);
  },

  create(school_id, data) {
    return db.prepare(
      'INSERT INTO teachers (school_id, name, email, phone, default_rate, revenue_percentage) VALUES (?, @name, @email, @phone, @default_rate, @revenue_percentage)'
    ).run(school_id, data);
  },

  update(id, school_id, data) {
    return db.prepare(
      'UPDATE teachers SET name=@name, email=@email, phone=@phone, default_rate=@default_rate, revenue_percentage=@revenue_percentage WHERE id=@id AND school_id=@school_id'
    ).run({ ...data, id, school_id });
  },

  remove(id, school_id) {
    return db.prepare('DELETE FROM teachers WHERE id = ? AND school_id = ?').run(id, school_id);
  },

  getAssignments(teacher_id) {
    return db.prepare(`
      SELECT ta.*, m.name as module_name, l.name as level_name, y.name as year_name
      FROM teacher_assignments ta
      LEFT JOIN modules m ON ta.module_id = m.id
      LEFT JOIN levels l ON ta.level_id = l.id
      LEFT JOIN years y ON ta.year_id = y.id
      WHERE ta.teacher_id = ?
    `).all(teacher_id);
  },
};

module.exports = Teacher;

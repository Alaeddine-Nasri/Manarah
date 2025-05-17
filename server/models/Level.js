const db = require('../db/db');

const Level = {
  findAll(school_id) {
    const levels = db.prepare('SELECT * FROM levels WHERE school_id = ? ORDER BY type, name').all(school_id);
    const years = db.prepare(`
      SELECT y.*,
        (SELECT COUNT(*) FROM students s WHERE s.year_id = y.id AND s.school_id = ?) as student_count
      FROM years y
      JOIN levels l ON y.level_id = l.id
      WHERE l.school_id = ?
      ORDER BY y.name
    `).all(school_id, school_id);
    const groups = db.prepare(`
      SELECT g.*,
        (SELECT COUNT(*) FROM student_groups sg
         JOIN students s ON sg.student_id = s.id
         WHERE sg.group_id = g.id AND s.school_id = ?) as student_count,
        m.name as module_name,
        t.name as teacher_name,
        (SELECT MIN(ses.date) FROM sessions ses
         WHERE ses.group_id = g.id AND ses.date >= date('now')) as next_session_date
      FROM groups g
      JOIN years y ON g.year_id = y.id
      JOIN levels l ON y.level_id = l.id
      LEFT JOIN modules m ON g.module_id = m.id
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE l.school_id = ?
      ORDER BY g.name
    `).all(school_id, school_id);

    return levels.map((level) => ({
      ...level,
      years: years
        .filter((y) => y.level_id === level.id)
        .map((year) => ({
          ...year,
          groups: groups.filter((g) => g.year_id === year.id),
        })),
    }));
  },

  createLevel(school_id, data) {
    return db.prepare('INSERT INTO levels (school_id, name, type) VALUES (?, @name, @type)').run(school_id, data);
  },

  createYear(data) {
    return db.prepare('INSERT INTO years (level_id, name) VALUES (@level_id, @name)').run(data);
  },

  createGroup(data) {
    return db.prepare('INSERT INTO groups (year_id, name, module_id, teacher_id) VALUES (@year_id, @name, @module_id, @teacher_id)').run(data);
  },

  getGroupById(id) {
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  },

  // make sure the level belongs to this school before mutating
  levelBelongsTo(id, school_id) {
    return db.prepare('SELECT id FROM levels WHERE id = ? AND school_id = ?').get(id, school_id);
  },

  yearBelongsTo(id, school_id) {
    return db.prepare(`
      SELECT y.id FROM years y JOIN levels l ON y.level_id = l.id
      WHERE y.id = ? AND l.school_id = ?
    `).get(id, school_id);
  },

  groupBelongsTo(id, school_id) {
    return db.prepare(`
      SELECT g.id FROM groups g
      JOIN years y ON g.year_id = y.id
      JOIN levels l ON y.level_id = l.id
      WHERE g.id = ? AND l.school_id = ?
    `).get(id, school_id);
  },

  updateLevel(id, { name, type }) {
    return db.prepare('UPDATE levels SET name = ?, type = ? WHERE id = ?').run(name, type, id);
  },

  updateYear(id, { name }) {
    return db.prepare('UPDATE years SET name = ? WHERE id = ?').run(name, id);
  },

  updateGroup(id, { name, module_id, teacher_id }) {
    return db.prepare('UPDATE groups SET name = ?, module_id = ?, teacher_id = ? WHERE id = ?').run(name, module_id ?? null, teacher_id ?? null, id);
  },

  getGroupStudents(group_id) {
    return db.prepare(`
      SELECT s.id, s.name, s.phone, s.status
      FROM student_groups sg
      JOIN students s ON sg.student_id = s.id
      WHERE sg.group_id = ?
      ORDER BY s.name
    `).all(group_id);
  },

  getAvailableStudents(group_id, year_id) {
    return db.prepare(`
      SELECT s.id, s.name
      FROM students s
      WHERE s.year_id = ?
        AND s.status = 'active'
        AND s.id NOT IN (
          SELECT student_id FROM student_groups WHERE group_id = ?
        )
      ORDER BY s.name
    `).all(year_id, group_id);
  },

  addStudentToGroup(student_id, group_id) {
    return db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)').run(student_id, group_id);
  },

  removeStudentFromGroup(student_id, group_id) {
    return db.prepare('DELETE FROM student_groups WHERE student_id = ? AND group_id = ?').run(student_id, group_id);
  },

  removeLevel(id) {
    return db.prepare('DELETE FROM levels WHERE id = ?').run(id);
  },

  removeYear(id) {
    return db.prepare('DELETE FROM years WHERE id = ?').run(id);
  },

  removeGroup(id) {
    return db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  },
};

module.exports = Level;

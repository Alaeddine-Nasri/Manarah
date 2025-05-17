const db = require('../db/db');

const Module = {
  findAll(school_id, filters = {}) {
    let query = `
      SELECT m.*, l.name as level_name, y.name as year_name
      FROM modules m
      LEFT JOIN levels l ON m.level_id = l.id
      LEFT JOIN years y ON m.year_id = y.id
      WHERE m.school_id = ?
    `;
    const params = [school_id];
    if (filters.level_id) { query += ' AND m.level_id = ?'; params.push(filters.level_id); }
    if (filters.year_id)  { query += ' AND m.year_id = ?';  params.push(filters.year_id); }
    query += ' ORDER BY m.name';
    return db.prepare(query).all(...params);
  },

  findById(id, school_id) {
    return db.prepare('SELECT * FROM modules WHERE id = ? AND school_id = ?').get(id, school_id);
  },

  create(school_id, data) {
    return db.prepare(
      'INSERT INTO modules (school_id, name, level_id, year_id) VALUES (?, @name, @level_id, @year_id)'
    ).run(school_id, data);
  },

  update(id, school_id, data) {
    return db.prepare(
      'UPDATE modules SET name=@name, level_id=@level_id, year_id=@year_id WHERE id=@id AND school_id=@school_id'
    ).run({ ...data, id, school_id });
  },

  remove(id, school_id) {
    return db.prepare('DELETE FROM modules WHERE id = ? AND school_id = ?').run(id, school_id);
  },
};

module.exports = Module;

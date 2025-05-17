const db = require('../db/db');

exports.findAll = (school_id, { month } = {}) => {
  let sql = `SELECT * FROM expenses WHERE school_id = ? ORDER BY date DESC, id DESC`;
  const params = [school_id];
  if (month) {
    sql = `SELECT * FROM expenses WHERE school_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC`;
    params.push(month);
  }
  return db.prepare(sql).all(...params);
};

exports.findById = (id, school_id) =>
  db.prepare('SELECT * FROM expenses WHERE id = ? AND school_id = ?').get(id, school_id);

exports.create = (school_id, { date, category, description, amount }) =>
  db.prepare(
    'INSERT INTO expenses (school_id, date, category, description, amount) VALUES (?, ?, ?, ?, ?)'
  ).run(school_id, date, category, description || null, amount);

exports.update = (id, school_id, { date, category, description, amount }) =>
  db.prepare(
    'UPDATE expenses SET date = ?, category = ?, description = ?, amount = ? WHERE id = ? AND school_id = ?'
  ).run(date, category, description || null, amount, id, school_id);

exports.remove = (id, school_id) =>
  db.prepare('DELETE FROM expenses WHERE id = ? AND school_id = ?').run(id, school_id);

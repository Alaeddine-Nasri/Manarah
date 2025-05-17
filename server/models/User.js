const db = require('../db/db');

const User = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  getSchools(user_id) {
    return db.prepare(`
      SELECT s.id, s.name, s.code, su.role, su.teacher_id
      FROM schools s
      JOIN school_users su ON s.id = su.school_id
      WHERE su.user_id = ?
      ORDER BY s.name
    `).all(user_id);
  },

  create(data) {
    return db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (@name, @email, @password_hash)'
    ).run(data);
  },

  updatePassword(id, password_hash) {
    return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, id);
  },
};

module.exports = User;

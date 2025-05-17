const bcrypt = require('bcryptjs');
const db = require('../db/db');
const User = require('../models/User');

exports.getAll = (req, res, next) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, su.role, u.created_at
      FROM users u
      JOIN school_users su ON u.id = su.user_id
      WHERE su.school_id = ?
      ORDER BY u.name
    `).all(req.user.school_id);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    let user = User.findByEmail(email);
    if (!user) {
      const hash = bcrypt.hashSync(password, 10);
      const result = User.create({ name, email, password_hash: hash });
      user = { id: result.lastInsertRowid, name, email };
    }

    const already = db.prepare('SELECT id FROM school_users WHERE school_id = ? AND user_id = ?').get(req.user.school_id, user.id);
    if (already) {
      return res.status(409).json({ message: 'User already belongs to this school' });
    }

    db.prepare('INSERT INTO school_users (school_id, user_id, role) VALUES (?, ?, ?)').run(
      req.user.school_id, user.id, role ?? 'staff'
    );

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: role ?? 'staff' });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'role is required' });

    const result = db.prepare(
      'UPDATE school_users SET role = ? WHERE school_id = ? AND user_id = ?'
    ).run(role, req.user.school_id, req.params.id);

    if (result.changes === 0) return res.status(404).json({ message: 'User not found in this school' });
    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
};

exports.setPassword = (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    // remove from school, not from the system (they may belong to other schools)
    const result = db.prepare(
      'DELETE FROM school_users WHERE school_id = ? AND user_id = ?'
    ).run(req.user.school_id, req.params.id);

    if (result.changes === 0) return res.status(404).json({ message: 'User not found in this school' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

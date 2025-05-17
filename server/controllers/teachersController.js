const db = require('../db/db');
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const { logAction } = require('../utils/audit');

const DEFAULT_PASSWORD = 'teacher123';

function ensureTeacherAccount(school_id, teacher) {
  if (!teacher.email) return null;
  // find or create global user
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(teacher.email);
  if (!user) {
    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    const r = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(teacher.name, teacher.email, hash);
    user = { id: r.lastInsertRowid };
  }
  // link to school as teacher role
  db.prepare('INSERT OR REPLACE INTO school_users (school_id, user_id, role, teacher_id) VALUES (?, ?, ?, ?)')
    .run(school_id, user.id, 'teacher', teacher.id);
  return user.id;
}

exports.getAll = (req, res, next) => {
  try {
    res.json(Teacher.findAll(req.user.school_id));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const assignments = Teacher.getAssignments(req.params.id);
    const overrides = db.prepare('SELECT * FROM rate_overrides WHERE teacher_id = ?').all(req.params.id);

    res.json({ ...teacher, assignments, overrides });
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { name, email, phone, default_rate, revenue_percentage } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const result = Teacher.create(req.user.school_id, {
      name, email, phone,
      default_rate: default_rate ?? 0,
      revenue_percentage: revenue_percentage ?? 70,
    });
    const created = Teacher.findById(result.lastInsertRowid, req.user.school_id);
    ensureTeacherAccount(req.user.school_id, created);
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'created', entity: 'teacher', entity_id: created.id,
      details: { name: created.name },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const { name, email, phone, default_rate, revenue_percentage } = req.body;
    Teacher.update(req.params.id, req.user.school_id, {
      name:               name               ?? teacher.name,
      email:              email              ?? teacher.email,
      phone:              phone              ?? teacher.phone,
      default_rate:       default_rate       ?? teacher.default_rate,
      revenue_percentage: revenue_percentage ?? teacher.revenue_percentage,
    });

    const updated = Teacher.findById(req.params.id, req.user.school_id);
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'updated', entity: 'teacher', entity_id: updated.id,
      details: { name: updated.name },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'deleted', entity: 'teacher', entity_id: teacher.id,
      details: { name: teacher.name },
    });
    Teacher.remove(req.params.id, req.user.school_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.addAssignment = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const { module_id, level_id, year_id } = req.body;
    if (!module_id) return res.status(400).json({ message: 'module_id is required' });

    const result = db.prepare(
      'INSERT INTO teacher_assignments (teacher_id, module_id, level_id, year_id) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, module_id, level_id ?? null, year_id ?? null);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    next(err);
  }
};

exports.removeAssignment = (req, res, next) => {
  try {
    db.prepare('DELETE FROM teacher_assignments WHERE id = ? AND teacher_id = ?').run(
      req.params.assignmentId,
      req.params.id
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.getAccount = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const row = db.prepare(`
      SELECT u.id, u.email, su.role FROM school_users su
      JOIN users u ON su.user_id = u.id
      WHERE su.school_id = ? AND su.teacher_id = ?
    `).get(req.user.school_id, teacher.id);
    res.json({ account: row || null, teacher_email: teacher.email });
  } catch (err) { next(err); }
};

exports.createAccount = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    if (!teacher.email) return res.status(400).json({ message: 'Teacher has no email — add an email first' });
    ensureTeacherAccount(req.user.school_id, teacher);
    res.json({ message: 'Compte créé avec succès', email: teacher.email });
  } catch (err) { next(err); }
};

exports.resetPassword = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const row = db.prepare(`
      SELECT u.id FROM school_users su JOIN users u ON su.user_id = u.id
      WHERE su.school_id = ? AND su.teacher_id = ?
    `).get(req.user.school_id, teacher.id);
    if (!row) return res.status(404).json({ message: 'No account for this teacher' });
    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.id);
    res.json({ message: 'Mot de passe réinitialisé à "teacher123"' });
  } catch (err) { next(err); }
};

exports.setRateOverride = (req, res, next) => {
  try {
    const teacher = Teacher.findById(req.params.id, req.user.school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const { level_id, module_id, rate } = req.body;
    if (rate == null) return res.status(400).json({ message: 'rate is required' });

    db.prepare(`
      INSERT INTO rate_overrides (teacher_id, level_id, module_id, rate)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(teacher_id, level_id, module_id) DO UPDATE SET rate=excluded.rate
    `).run(req.params.id, level_id ?? null, module_id ?? null, rate);

    res.json({ message: 'Rate override saved' });
  } catch (err) {
    next(err);
  }
};

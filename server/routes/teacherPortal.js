const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../db/db');

// GET /api/teacher-portal/sessions — past 14 days + upcoming 14 days
router.get('/sessions', auth, (req, res, next) => {
  try {
    if (!req.user.teacher_id) return res.status(403).json({ message: 'Not a teacher account' });
    const teacher_id = req.user.teacher_id;
    const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const to   = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const sessions = db.prepare(`
      SELECT s.*, t.name as teacher_name, m.name as module_name, g.name as group_name,
             y.name as year_name, l.name as level_name
      FROM sessions s
      JOIN teachers t ON t.id = s.teacher_id
      JOIN modules m  ON m.id = s.module_id
      JOIN groups g   ON g.id = s.group_id
      JOIN years y    ON y.id = g.year_id
      JOIN levels l   ON l.id = y.level_id
      WHERE s.teacher_id = ? AND s.school_id = ? AND s.date BETWEEN ? AND ?
      ORDER BY s.date ASC, s.start_time ASC
    `).all(teacher_id, req.user.school_id, from, to);
    res.json(sessions);
  } catch (err) { next(err); }
});

// GET /api/teacher-portal/payments — all payments for this teacher
router.get('/payments', auth, (req, res, next) => {
  try {
    if (!req.user.teacher_id) return res.status(403).json({ message: 'Not a teacher account' });
    const teacher_id = req.user.teacher_id;
    const payments = db.prepare(`
      SELECT p.*, s.name as student_name, m.name as module_name
      FROM payments p
      JOIN students s ON s.id = p.student_id
      LEFT JOIN modules m ON m.id = p.module_id
      WHERE p.teacher_id = ? AND p.school_id = ?
      ORDER BY p.created_at DESC
    `).all(teacher_id, req.user.school_id);
    const total = payments.reduce((sum, p) => sum + (p.teacher_amount || 0), 0);
    res.json({ payments, total });
  } catch (err) { next(err); }
});

// GET /api/teacher-portal/summary — quick stats
router.get('/summary', auth, (req, res, next) => {
  try {
    if (!req.user.teacher_id) return res.status(403).json({ message: 'Not a teacher account' });
    const teacher_id = req.user.teacher_id;
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);
    const upcoming = db.prepare(
      `SELECT COUNT(*) as count FROM sessions WHERE teacher_id = ? AND school_id = ? AND date >= ?`
    ).get(teacher_id, req.user.school_id, today);
    const monthEarnings = db.prepare(
      `SELECT COALESCE(SUM(teacher_amount), 0) as total FROM payments WHERE teacher_id = ? AND school_id = ? AND strftime('%Y-%m', created_at) = ?`
    ).get(teacher_id, req.user.school_id, month);
    const lastMonthEarnings = db.prepare(
      `SELECT COALESCE(SUM(teacher_amount), 0) as total FROM payments WHERE teacher_id = ? AND school_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`
    ).get(teacher_id, req.user.school_id);
    const allTimeEarnings = db.prepare(
      `SELECT COALESCE(SUM(teacher_amount), 0) as total FROM payments WHERE teacher_id = ? AND school_id = ?`
    ).get(teacher_id, req.user.school_id);
    res.json({
      upcoming_sessions: upcoming.count,
      month_earnings: monthEarnings.total,
      last_month_earnings: lastMonthEarnings.total,
      total_earnings: allTimeEarnings.total,
    });
  } catch (err) { next(err); }
});

module.exports = router;

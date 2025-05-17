const db = require('../db/db');

exports.getStats = (req, res, next) => {
  try {
    const { school_id } = req.user;
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7); // "YYYY-MM"

    const total_students = db.prepare(
      `SELECT COUNT(*) as n FROM students WHERE school_id = ? AND status = 'active'`
    ).get(school_id).n;

    const total_teachers = db.prepare(
      `SELECT COUNT(*) as n FROM teachers WHERE school_id = ?`
    ).get(school_id).n;

    const sessions_today = db.prepare(
      `SELECT COUNT(*) as n FROM sessions WHERE school_id = ? AND date = ?`
    ).get(school_id, today).n;

    const revenue_this_month = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE school_id = ? AND strftime('%Y-%m', created_at) = ?`
    ).get(school_id, thisMonth).total;

    const pending_payments = db.prepare(
      `SELECT COUNT(DISTINCT student_id) as n FROM payments WHERE school_id = ? AND (sessions_count - sessions_paid) <= 0`
    ).get(school_id).n;

    const attRow = db.prepare(`
      SELECT
        CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS REAL) as present_count,
        COUNT(*) as total_count
      FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      WHERE s.school_id = ? AND strftime('%Y-%m', s.date) = ?
    `).get(school_id, thisMonth);

    const attendance_rate_this_month = attRow.total_count > 0
      ? Math.round((attRow.present_count / attRow.total_count) * 100)
      : null;

    res.json({
      total_students,
      total_teachers,
      sessions_today,
      revenue_this_month,
      pending_payments,
      attendance_rate_this_month,
    });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueChart = (req, res, next) => {
  try {
    const { school_id } = req.user;

    const rows = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE school_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(school_id);

    res.json(rows.reverse());
  } catch (err) {
    next(err);
  }
};

exports.getAttendanceChart = (req, res, next) => {
  try {
    const { school_id } = req.user;

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', s.date) as month,
        CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS REAL) as present_count,
        COUNT(*) as total_count
      FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      WHERE s.school_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `).all(school_id);

    const data = rows.reverse().map(r => ({
      month: r.month,
      rate: r.total_count > 0 ? Math.round((r.present_count / r.total_count) * 100) : 0,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getRecentActivity = (req, res, next) => {
  try {
    const { school_id } = req.user;

    const payments = db.prepare(`
      SELECT p.id, p.amount, p.created_at, s.name as student_name,
             m.name as module_name, t.name as teacher_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN modules m ON p.module_id = m.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      WHERE p.school_id = ?
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all(school_id);

    const sessions = db.prepare(`
      SELECT se.id, se.date, se.start_time, se.end_time,
             t.name as teacher_name, m.name as module_name, g.name as group_name
      FROM sessions se
      JOIN teachers t ON se.teacher_id = t.id
      JOIN modules m ON se.module_id = m.id
      JOIN groups g ON se.group_id = g.id
      WHERE se.school_id = ?
      ORDER BY se.date DESC, se.start_time DESC
      LIMIT 5
    `).all(school_id);

    res.json({ payments, sessions });
  } catch (err) {
    next(err);
  }
};

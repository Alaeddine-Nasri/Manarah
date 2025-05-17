const db = require('../db/db');
const Teacher = require('../models/Teacher');
const PayrollRecord = require('../models/PayrollRecord');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// GET /api/payroll?month=YYYY-MM
// Summary row per teacher
exports.getAll = (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const school_id = req.user.school_id;

    const teachers = Teacher.findAll(school_id);

    const result = teachers.map(teacher => {
      const earningsRow = db.prepare(`
        SELECT COALESCE(SUM(teacher_amount), 0) as total_earnings
        FROM payments
        WHERE school_id = ? AND teacher_id = ? AND strftime('%Y-%m', created_at) = ?
      `).get(school_id, teacher.id, month);

      const sessionsRow = db.prepare(`
        SELECT COUNT(*) as total_sessions
        FROM sessions
        WHERE school_id = ? AND teacher_id = ? AND date LIKE ?
      `).get(school_id, teacher.id, `${month}%`);

      const record = PayrollRecord.find(school_id, teacher.id, month);

      return {
        teacher_id:      teacher.id,
        teacher_name:    teacher.name,
        total_sessions:  sessionsRow.total_sessions,
        total_earnings:  earningsRow.total_earnings,
        is_paid:         !!record,
        paid_at:         record?.marked_paid_at || null,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/payroll/:teacher_id?month=YYYY-MM
// Detailed breakdown for one teacher
exports.getOne = (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const school_id = req.user.school_id;
    const teacher_id = req.params.teacher_id;

    const teacher = Teacher.findById(teacher_id, school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const payments = db.prepare(`
      SELECT p.*, s.name as student_name, m.name as module_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN modules m ON p.module_id = m.id
      WHERE p.school_id = ? AND p.teacher_id = ? AND strftime('%Y-%m', p.created_at) = ?
      ORDER BY p.created_at DESC
    `).all(school_id, teacher_id, month);

    const total_earnings = payments.reduce((sum, p) => sum + (p.teacher_amount || 0), 0);

    const sessionsRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM sessions
      WHERE school_id = ? AND teacher_id = ? AND date LIKE ?
    `).get(school_id, teacher_id, `${month}%`);

    const record = PayrollRecord.find(school_id, teacher_id, month);

    res.json({
      teacher,
      month,
      payments,
      total_earnings,
      total_sessions: sessionsRow.cnt || 0,
      is_paid:        !!record,
      paid_at:        record?.marked_paid_at || null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payroll/:teacher_id/mark-paid?month=YYYY-MM
exports.markPaid = (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const school_id = req.user.school_id;
    const teacher_id = req.params.teacher_id;

    const teacher = Teacher.findById(teacher_id, school_id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    PayrollRecord.upsert(school_id, teacher_id, month);
    res.json({ message: 'Marked as paid', month });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/payroll/:teacher_id/mark-paid?month=YYYY-MM
exports.markUnpaid = (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    const school_id = req.user.school_id;
    const teacher_id = req.params.teacher_id;

    PayrollRecord.remove(school_id, teacher_id, month);
    res.json({ message: 'Marked as unpaid', month });
  } catch (err) {
    next(err);
  }
};

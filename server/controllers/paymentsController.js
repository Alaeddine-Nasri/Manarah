const db = require('../db/db');
const Payment = require('../models/Payment');
const { logAction } = require('../utils/audit');
const { createNotification } = require('../utils/notify');

function computeStatus(p) {
  const remaining = (p.sessions_count || 0) - (p.sessions_paid || 0);
  let status;
  if (remaining <= 0)      status = 'overdue';
  else if (remaining < 3)  status = 'due_soon';
  else                     status = 'current';
  return { ...p, remaining, status };
}

exports.getAll = (req, res, next) => {
  try {
    const { student_id, teacher_id, month, status } = req.query;
    let payments = Payment.findAll(req.user.school_id, { student_id, teacher_id, month })
      .map(computeStatus);
    if (status) {
      payments = payments.filter(p => p.status === status);
    }
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

exports.getSummary = (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    res.json(Payment.getSummary(req.user.school_id, month));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const payment = Payment.findById(req.params.id, req.user.school_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(computeStatus(payment));
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { student_id, teacher_id, module_id, amount, type, sessions_count } = req.body;
    if (!student_id || !amount) {
      return res.status(400).json({ message: 'student_id and amount are required' });
    }

    const count = sessions_count ?? 4;
    const teacher_amount = teacher_id ? resolveTeacherAmount(teacher_id, module_id, count, amount) : 0;

    const result = Payment.create(req.user.school_id, {
      student_id,
      teacher_id:     teacher_id ?? null,
      module_id:      module_id  ?? null,
      amount,
      teacher_amount,
      school_amount:  amount - teacher_amount,
      type:           type ?? 'pack',
      sessions_count: count,
      sessions_paid:  0,
    });

    const created = computeStatus(Payment.findById(result.lastInsertRowid, req.user.school_id));
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'created', entity: 'payment', entity_id: created.id,
      details: { student_name: created.student_name, amount: created.amount, type: created.type },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const payment = Payment.findById(req.params.id, req.user.school_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    Payment.update(req.params.id, req.user.school_id, {
      sessions_paid: req.body.sessions_paid ?? payment.sessions_paid,
      amount:        req.body.amount        ?? payment.amount,
    });

    res.json(computeStatus(Payment.findById(req.params.id, req.user.school_id)));
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const payment = Payment.findById(req.params.id, req.user.school_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'deleted', entity: 'payment', entity_id: payment.id,
      details: { student_name: payment.student_name, amount: payment.amount },
    });

    Payment.remove(req.params.id, req.user.school_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.consume = (req, res, next) => {
  try {
    const payment = Payment.findById(req.params.id, req.user.school_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.sessions_paid >= payment.sessions_count) {
      return res.status(400).json({ message: 'All sessions already consumed' });
    }

    const newPaid = payment.sessions_paid + 1;
    Payment.update(req.params.id, req.user.school_id, {
      sessions_paid: newPaid,
      amount: payment.amount,
    });

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'session_recorded', entity: 'payment', entity_id: payment.id,
      details: { student_name: payment.student_name, sessions_paid: newPaid, sessions_count: payment.sessions_count },
    });

    // Notify when pack is exhausted
    if (newPaid >= payment.sessions_count && payment.student_name) {
      const module = payment.module_name ? ` (${payment.module_name})` : '';
      createNotification({
        school_id: req.user.school_id,
        type: 'payment_reminder',
        message: `${payment.student_name}${module} a épuisé son pack — renouvellement requis`,
      });
    }

    res.json(computeStatus(Payment.findById(req.params.id, req.user.school_id)));
  } catch (err) {
    next(err);
  }
};

exports.previewSplit = (req, res, next) => {
  try {
    const { teacher_id, module_id, sessions_count, amount } = req.query;
    if (!teacher_id) return res.json({ teacher_amount: 0 });
    const count = parseInt(sessions_count, 10) || 1;
    const totalAmount = parseFloat(amount) || 0;
    const teacher_amount = resolveTeacherAmount(teacher_id, module_id || null, count, totalAmount);
    res.json({ teacher_amount, rate_per_session: count ? teacher_amount / count : 0 });
  } catch (err) {
    next(err);
  }
};

function resolveTeacherAmount(teacher_id, module_id, sessions_count, total_amount = 0) {
  const override = db.prepare(
    'SELECT rate FROM rate_overrides WHERE teacher_id = ? AND (module_id = ? OR module_id IS NULL) ORDER BY module_id DESC LIMIT 1'
  ).get(teacher_id, module_id ?? null);

  if (override) return override.rate * sessions_count;

  const teacher = db.prepare('SELECT revenue_percentage, default_rate FROM teachers WHERE id = ?').get(teacher_id);
  if (!teacher) return 0;
  // Use revenue_percentage if set, else fall back to per-session default_rate
  if (teacher.revenue_percentage != null && total_amount > 0) {
    return (total_amount * teacher.revenue_percentage) / 100;
  }
  return (teacher.default_rate ?? 0) * sessions_count;
}

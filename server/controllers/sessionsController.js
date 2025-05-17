const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const db = require('../db/db');
const { logAction } = require('../utils/audit');
const { createNotification } = require('../utils/notify');

exports.getAll = (req, res, next) => {
  try {
    const { date, week_start, teacher_id, group_id } = req.query;
    const school_id = req.user.school_id;

    // Fire session-reminder notifications for sessions starting within 30 min
    checkSessionReminders(school_id);

    if (week_start) {
      const start = new Date(week_start);
      const end = new Date(week_start);
      end.setDate(end.getDate() + 6);
      return res.json(Session.findByRange(
        school_id,
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        { teacher_id, group_id }
      ));
    }

    res.json(Session.findAll(school_id, { date, teacher_id, group_id }));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const session = Session.findById(req.params.id, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { teacher_id, module_id, group_id, start_time, end_time, type, date, recurrence, start_date, end_date, days_of_week } = req.body;
    const school_id = req.user.school_id;

    if (!teacher_id || !module_id || !group_id || !start_time || !end_time) {
      return res.status(400).json({ message: 'teacher_id, module_id, group_id, start_time, end_time are required' });
    }

    if (type === 'recurring') {
      if (!start_date || !end_date || !recurrence) {
        return res.status(400).json({ message: 'start_date, end_date and recurrence are required for recurring sessions' });
      }

      const dates = generateDates(recurrence, start_date, end_date, days_of_week || []);
      if (dates.length === 0) {
        return res.status(400).json({ message: 'No dates generated for the given recurrence rule' });
      }

      const recurrence_group = uuidv4();
      dates.forEach((d) =>
        Session.create(school_id, { teacher_id, module_id, group_id, date: d, start_time, end_time, type: 'recurring', recurrence_group })
      );

      return res.status(201).json({ count: dates.length, recurrence_group });
    }

    if (!date) return res.status(400).json({ message: 'date is required for one-time sessions' });
    const result = Session.create(school_id, { teacher_id, module_id, group_id, date, start_time, end_time, type: 'one_time', recurrence_group: null });
    const created = Session.findById(result.lastInsertRowid, school_id);
    logAction({
      school_id, user_id: req.user.id,
      action: 'created', entity: 'session', entity_id: created.id,
      details: { module: created.module_name, group: created.group_name, date: created.date },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const school_id = req.user.school_id;
    const session = Session.findById(req.params.id, school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const { teacher_id, module_id, group_id, date, start_time, end_time, attendance_open } = req.body;
    Session.update(req.params.id, school_id, {
      teacher_id:      teacher_id      ?? session.teacher_id,
      module_id:       module_id       ?? session.module_id,
      group_id:        group_id        ?? session.group_id,
      date:            date            ?? session.date,
      start_time:      start_time      ?? session.start_time,
      end_time:        end_time        ?? session.end_time,
      attendance_open: attendance_open ?? session.attendance_open,
    });

    res.json(Session.findById(req.params.id, school_id));
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const school_id = req.user.school_id;
    const session = Session.findById(req.params.id, school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (req.query.also_recurring === 'true' && session.recurrence_group) {
      Session.removeByRecurrenceGroup(session.recurrence_group, school_id);
    } else {
      Session.remove(req.params.id, school_id);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

function checkSessionReminders(school_id) {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const upcoming = db.prepare(`
      SELECT s.id, s.start_time, s.attendance_open,
             m.name as module_name, g.name as group_name
      FROM sessions s
      LEFT JOIN modules m ON s.module_id = m.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.school_id = ? AND s.date = ? AND s.attendance_open = 0
    `).all(school_id, today);

    for (const session of upcoming) {
      const [h, m] = (session.start_time || '00:00').split(':').map(Number);
      const startMs = new Date(now);
      startMs.setHours(h, m, 0, 0);
      const diffMin = (startMs - now) / 60000;
      if (diffMin > 0 && diffMin <= 30) {
        const alreadyNotified = db.prepare(
          `SELECT id FROM notifications WHERE school_id = ? AND type = 'session_reminder' AND message LIKE ? AND DATE(created_at) = ?`
        ).get(school_id, `%[${session.id}]%`, today);
        if (!alreadyNotified) {
          createNotification({
            school_id,
            type: 'session_reminder',
            message: `La séance de ${session.module_name || 'cours'} (${session.group_name || 'groupe'}) commence dans ${Math.round(diffMin)} min [${session.id}]`,
          });
        }
      }
    }
  } catch { /* non-critical, don't break main request */ }
}

function generateDates(recurrence, start_date, end_date, days_of_week) {
  const dates = [];
  const current = new Date(start_date);
  const end = new Date(end_date);

  while (current <= end) {
    const day = current.getDay();
    if (recurrence === 'daily' || (recurrence === 'weekly' && days_of_week.includes(day))) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

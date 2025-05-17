const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Student = require('../models/Student');
const { logAction } = require('../utils/audit');
const { createNotification } = require('../utils/notify');

exports.getBySession = (req, res, next) => {
  try {
    const session = Session.findById(req.params.sessionId, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const records = Attendance.findBySession(req.params.sessionId);
    res.json({ session, records });
  } catch (err) {
    next(err);
  }
};

exports.getRoster = (req, res, next) => {
  try {
    const session = Session.findById(req.params.sessionId, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const roster = Attendance.getRoster(req.params.sessionId, session.group_id);
    res.json({ session, roster });
  } catch (err) {
    next(err);
  }
};

exports.scan = (req, res, next) => {
  try {
    const { qr_code, session_id } = req.body;
    if (!qr_code) return res.status(400).json({ message: 'qr_code is required' });

    const student = Student.findByQrCode(qr_code);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.school_id !== req.user.school_id) {
      return res.status(403).json({ message: 'Student does not belong to this school' });
    }

    const studentInfo = {
      id: student.id, name: student.name, phone: student.phone,
      level_name: student.level_name, year_name: student.year_name,
      group_name: student.group_name, status: student.status,
    };

    // Auto-detect: find any open session for this student's group
    const db = require('../db/db');
    let session = null;
    if (session_id) {
      session = Session.findById(session_id, req.user.school_id);
      if (!session) return res.status(404).json({ message: 'Session not found' });
    } else {
      // Find an open session whose group matches this student
      session = db.prepare(`
        SELECT * FROM sessions
        WHERE school_id = ? AND attendance_open = 1 AND group_id = ?
        ORDER BY date DESC, start_time DESC LIMIT 1
      `).get(req.user.school_id, student.group_id);
    }

    if (!session) return res.json({ status: 'info_only', student: studentInfo });

    if (!session.attendance_open) {
      return res.json({ status: 'session_closed', student: studentInfo, session });
    }

    if (student.group_id !== session.group_id) {
      return res.json({ status: 'wrong_group', student: studentInfo, session });
    }

    const existing = Attendance.findOne(session.id, student.id);
    if (existing && existing.status === 'present') {
      return res.json({ status: 'already_scanned', student: studentInfo, session });
    }

    Attendance.upsert(session.id, student.id, 'present', new Date().toISOString());
    res.json({ status: 'present', student: studentInfo, session });
  } catch (err) {
    next(err);
  }
};

exports.getLastScan = (req, res, next) => {
  try {
    const row = require('../db/db').prepare(`
      SELECT a.scanned_at, a.status, s.name as student_name, s.id as student_id
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN sessions ss ON a.session_id = ss.id
      WHERE ss.school_id = ? AND a.scanned_at IS NOT NULL
      ORDER BY a.scanned_at DESC
      LIMIT 1
    `).get(req.user.school_id);
    res.json({ scan: row || null });
  } catch (err) {
    next(err);
  }
};

exports.setStatus = (req, res, next) => {
  try {
    const { sessionId, studentId } = req.params;
    const { status } = req.body;
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'status must be present or absent' });
    }

    const session = Session.findById(sessionId, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const scanned_at = status === 'present' ? new Date().toISOString() : null;
    Attendance.upsert(sessionId, studentId, status, scanned_at);

    const records = Attendance.findBySession(sessionId);
    res.json({ records });
  } catch (err) {
    next(err);
  }
};

exports.openWindow = (req, res, next) => {
  try {
    const session = Session.findById(req.params.sessionId, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    Session.setAttendanceOpen(req.params.sessionId, req.user.school_id, true);

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'attendance_opened', entity: 'session', entity_id: session.id,
      details: { module: session.module_name, group: session.group_name, date: session.date },
    });

    res.json({ message: 'Attendance window opened' });
  } catch (err) {
    next(err);
  }
};

exports.closeWindow = (req, res, next) => {
  try {
    const session = Session.findById(req.params.sessionId, req.user.school_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const students = Student.findAll(req.user.school_id, { group_id: session.group_id, status: 'active' });
    Attendance.markAbsent(session.id, students.map((s) => s.id));

    Session.setAttendanceOpen(req.params.sessionId, req.user.school_id, false);

    const records = Attendance.findBySession(session.id);
    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent:  records.filter((r) => r.status === 'absent').length,
      total:   records.length,
    };

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'attendance_closed', entity: 'session', entity_id: session.id,
      details: { module: session.module_name, group: session.group_name, ...summary },
    });

    // Notify for each absent student (limit to avoid spam)
    const absentRecords = records.filter(r => r.status === 'absent').slice(0, 10);
    const dateStr = session.date
      ? new Date(session.date).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long' })
      : session.date;
    for (const rec of absentRecords) {
      createNotification({
        school_id: req.user.school_id,
        type: 'absence_alert',
        message: `${rec.student_name} était absent(e) — ${session.module_name || 'Séance'}, ${dateStr}`,
      });
    }

    res.json({ message: 'Attendance window closed', summary, records });
  } catch (err) {
    next(err);
  }
};

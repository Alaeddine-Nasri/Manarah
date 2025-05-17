const db = require('../db/db');

exports.getAll = (req, res, next) => {
  try {
    const notifications = db.prepare(`
      SELECT id, type, message, read, created_at
      FROM notifications
      WHERE school_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.school_id);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

exports.markRead = (req, res, next) => {
  try {
    db.prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND school_id = ?`)
      .run(req.params.id, req.user.school_id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = (req, res, next) => {
  try {
    db.prepare(`UPDATE notifications SET read = 1 WHERE school_id = ?`)
      .run(req.user.school_id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    db.prepare(`DELETE FROM notifications WHERE id = ? AND school_id = ?`)
      .run(req.params.id, req.user.school_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

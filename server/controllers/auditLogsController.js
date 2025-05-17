const db = require('../db/db');

exports.getAll = (req, res, next) => {
  try {
    const { entity, action, user_id, from, to } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    let where = 'WHERE al.school_id = ?';
    const params = [req.user.school_id];

    if (entity)  { where += ' AND al.entity = ?';  params.push(entity); }
    if (action)  { where += ' AND al.action = ?';  params.push(action); }
    if (user_id) { where += ' AND al.user_id = ?'; params.push(user_id); }
    if (from)    { where += ' AND DATE(al.created_at) >= ?'; params.push(from); }
    if (to)      { where += ' AND DATE(al.created_at) <= ?'; params.push(to); }

    const total = db.prepare(
      `SELECT COUNT(*) as n FROM audit_logs al ${where}`
    ).get(...params).n;

    const rows = db.prepare(`
      SELECT al.id, al.action, al.entity, al.entity_id, al.details, al.created_at,
             u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const parsed = rows.map(r => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    }));

    res.json({ rows: parsed, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

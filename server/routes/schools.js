const router = require('express').Router();
const { auth, adminOnly } = require('../middleware/auth');
const db = require('../db/db');

router.use(auth, adminOnly);

router.get('/info', (req, res, next) => {
  try {
    const school = db.prepare('SELECT id, name, code, location FROM schools WHERE id = ?').get(req.user.school_id);
    const { count: student_count } = db.prepare('SELECT COUNT(*) as count FROM students WHERE school_id = ?').get(req.user.school_id);
    const { count: teacher_count } = db.prepare('SELECT COUNT(*) as count FROM teachers WHERE school_id = ?').get(req.user.school_id);
    const { count: group_count }   = db.prepare(`
      SELECT COUNT(*) as count FROM groups g
      JOIN years y ON g.year_id = y.id
      JOIN levels l ON y.level_id = l.id
      WHERE l.school_id = ?
    `).get(req.user.school_id);
    res.json({ ...school, student_count, teacher_count, group_count });
  } catch (err) { next(err); }
});

router.patch('/info', (req, res, next) => {
  try {
    const { name, location } = req.body;
    if (name)                db.prepare('UPDATE schools SET name = ? WHERE id = ?').run(name, req.user.school_id);
    if (location !== undefined) db.prepare('UPDATE schools SET location = ? WHERE id = ?').run(location, req.user.school_id);
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
});

module.exports = router;

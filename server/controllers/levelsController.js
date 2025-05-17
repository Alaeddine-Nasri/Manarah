const Level = require('../models/Level');

exports.getAll = (req, res, next) => {
  try {
    res.json(Level.findAll(req.user.school_id));
  } catch (err) {
    next(err);
  }
};

exports.createLevel = (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'name and type are required' });
    const result = Level.createLevel(req.user.school_id, { name, type });
    res.status(201).json({ id: result.lastInsertRowid, name, type });
  } catch (err) {
    next(err);
  }
};

exports.createYear = (req, res, next) => {
  try {
    const level_id = Number(req.params.levelId);
    if (!Level.levelBelongsTo(level_id, req.user.school_id)) {
      return res.status(404).json({ message: 'Level not found' });
    }
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    const result = Level.createYear({ level_id, name });
    res.status(201).json({ id: result.lastInsertRowid, level_id, name });
  } catch (err) {
    next(err);
  }
};

exports.createGroup = (req, res, next) => {
  try {
    const year_id = Number(req.params.yearId);
    if (!Level.yearBelongsTo(year_id, req.user.school_id)) {
      return res.status(404).json({ message: 'Year not found' });
    }
    const { name, module_id, teacher_id } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    const result = Level.createGroup({ year_id, name, module_id: module_id || null, teacher_id: teacher_id || null });
    res.status(201).json({ id: result.lastInsertRowid, year_id, name, module_id: module_id || null, teacher_id: teacher_id || null });
  } catch (err) {
    next(err);
  }
};

exports.getGroupStudents = (req, res, next) => {
  try {
    const group = Level.groupBelongsTo(req.params.id, req.user.school_id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const fullGroup = Level.getGroupById(Number(req.params.id));
    const students = Level.getGroupStudents(Number(req.params.id));
    const available = fullGroup ? Level.getAvailableStudents(Number(req.params.id), fullGroup.year_id) : [];
    res.json({ students, available });
  } catch (err) { next(err); }
};

exports.addStudentToGroup = (req, res, next) => {
  try {
    if (!Level.groupBelongsTo(req.params.id, req.user.school_id))
      return res.status(404).json({ message: 'Group not found' });
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ message: 'student_id required' });
    Level.addStudentToGroup(student_id, Number(req.params.id));
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
};

exports.removeStudentFromGroup = (req, res, next) => {
  try {
    if (!Level.groupBelongsTo(req.params.id, req.user.school_id))
      return res.status(404).json({ message: 'Group not found' });
    Level.removeStudentFromGroup(Number(req.params.studentId), Number(req.params.id));
    res.status(204).end();
  } catch (err) { next(err); }
};

exports.removeLevel = (req, res, next) => {
  try {
    if (!Level.levelBelongsTo(req.params.id, req.user.school_id)) {
      return res.status(404).json({ message: 'Level not found' });
    }
    Level.removeLevel(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.removeYear = (req, res, next) => {
  try {
    if (!Level.yearBelongsTo(req.params.id, req.user.school_id)) {
      return res.status(404).json({ message: 'Year not found' });
    }
    Level.removeYear(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.removeGroup = (req, res, next) => {
  try {
    if (!Level.groupBelongsTo(req.params.id, req.user.school_id)) {
      return res.status(404).json({ message: 'Group not found' });
    }
    Level.removeGroup(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.updateLevel = (req, res, next) => {
  try {
    if (!Level.levelBelongsTo(req.params.id, req.user.school_id))
      return res.status(404).json({ message: 'Level not found' });
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'name and type required' });
    Level.updateLevel(req.params.id, { name, type });
    res.json({ id: Number(req.params.id), name, type });
  } catch (err) { next(err); }
};

exports.updateYear = (req, res, next) => {
  try {
    if (!Level.yearBelongsTo(req.params.id, req.user.school_id))
      return res.status(404).json({ message: 'Year not found' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    Level.updateYear(req.params.id, { name });
    res.json({ id: Number(req.params.id), name });
  } catch (err) { next(err); }
};

exports.updateGroup = (req, res, next) => {
  try {
    if (!Level.groupBelongsTo(req.params.id, req.user.school_id))
      return res.status(404).json({ message: 'Group not found' });
    const { name, module_id, teacher_id } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    Level.updateGroup(req.params.id, { name, module_id: module_id || null, teacher_id: teacher_id || null });
    res.json({ id: Number(req.params.id), name, module_id: module_id || null, teacher_id: teacher_id || null });
  } catch (err) { next(err); }
};

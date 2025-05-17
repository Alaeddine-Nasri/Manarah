const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Student = require('../models/Student');
const { logAction } = require('../utils/audit');

exports.getAll = (req, res, next) => {
  try {
    const { level_id, year_id, group_id, status } = req.query;
    res.json(Student.findAll(req.user.school_id, { level_id, year_id, group_id, status }));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { name, email, phone, parent_phone, level_id, year_id, group_id, group_ids, birth_date } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const qr_code = uuidv4();
    // primary group_id = first from group_ids, or the passed group_id
    const parsedGroupIds = group_ids ? (Array.isArray(group_ids) ? group_ids : [group_ids]) : (group_id ? [group_id] : []);
    const primaryGroupId = parsedGroupIds[0] ?? null;

    const result = Student.create(req.user.school_id, {
      name, email, phone, parent_phone,
      level_id: level_id ?? null,
      year_id: year_id ?? null,
      group_id: primaryGroupId,
      birth_date: birth_date ?? null,
      group_ids: parsedGroupIds,
      qr_code,
    });

    const created = Student.findById(result.lastInsertRowid, req.user.school_id);
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'created', entity: 'student', entity_id: created.id,
      details: { name: created.name, level: created.level_name, group: created.group_name },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { name, email, phone, parent_phone, level_id, year_id, group_id, group_ids, birth_date, status } = req.body;

    const parsedGroupIds = group_ids ? (Array.isArray(group_ids) ? group_ids : [group_ids])
                         : group_id !== undefined ? [group_id].filter(Boolean) : undefined;
    const primaryGroupId = parsedGroupIds?.length ? parsedGroupIds[0] : (group_id ?? student.group_id);

    Student.update(req.params.id, req.user.school_id, {
      name:         name         ?? student.name,
      email:        email        ?? student.email,
      phone:        phone        ?? student.phone,
      parent_phone: parent_phone ?? student.parent_phone,
      level_id:     level_id     ?? student.level_id,
      year_id:      year_id      ?? student.year_id,
      group_id:     primaryGroupId,
      birth_date:   birth_date   !== undefined ? birth_date : student.birth_date,
      status:       status       ?? student.status,
      group_ids:    parsedGroupIds,
    });

    const updated = Student.findById(req.params.id, req.user.school_id);
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'updated', entity: 'student', entity_id: updated.id,
      details: { name: updated.name },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'deleted', entity: 'student', entity_id: student.id,
      details: { name: student.name },
    });

    Student.remove(req.params.id, req.user.school_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.promote = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { year_id } = req.body;
    if (!year_id) return res.status(400).json({ message: 'year_id is required' });

    Student.update(req.params.id, req.user.school_id, { ...student, year_id });
    const updated = Student.findById(req.params.id, req.user.school_id);

    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'promoted', entity: 'student', entity_id: student.id,
      details: { name: student.name, to_year: updated.year_name },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.transferGroup = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { group_id } = req.body;
    if (!group_id) return res.status(400).json({ message: 'group_id is required' });

    Student.update(req.params.id, req.user.school_id, { ...student, group_id, group_ids: [group_id] });
    res.json(Student.findById(req.params.id, req.user.school_id));
  } catch (err) {
    next(err);
  }
};

exports.setStatus = (req, res, next) => {
  try {
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const { status } = req.body;
    if (!['active', 'suspended', 'archived'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    Student.update(req.params.id, req.user.school_id, { ...student, status });
    logAction({
      school_id: req.user.school_id, user_id: req.user.id,
      action: 'status_changed', entity: 'student', entity_id: student.id,
      details: { name: student.name, from: student.status, to: status },
    });

    res.json(Student.findById(req.params.id, req.user.school_id));
  } catch (err) { next(err); }
};

exports.uploadPhoto = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const student = Student.findById(req.params.id, req.user.school_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const photo_url = `/uploads/students/${req.file.filename}`;
    Student.updatePhoto(req.params.id, req.user.school_id, photo_url);
    res.json({ photo_url });
  } catch (err) { next(err); }
};

const Module = require('../models/Module');

exports.getAll = (req, res, next) => {
  try {
    const { level_id, year_id } = req.query;
    res.json(Module.findAll(req.user.school_id, { level_id, year_id }));
  } catch (err) {
    next(err);
  }
};

exports.getOne = (req, res, next) => {
  try {
    const module = Module.findById(req.params.id, req.user.school_id);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { name, level_id, year_id } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const result = Module.create(req.user.school_id, { name, level_id: level_id ?? null, year_id: year_id ?? null });
    res.status(201).json(Module.findById(result.lastInsertRowid, req.user.school_id));
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const existing = Module.findById(req.params.id, req.user.school_id);
    if (!existing) return res.status(404).json({ message: 'Module not found' });

    const { name, level_id, year_id } = req.body;
    Module.update(req.params.id, req.user.school_id, {
      name:     name     ?? existing.name,
      level_id: level_id ?? existing.level_id,
      year_id:  year_id  ?? existing.year_id,
    });

    res.json(Module.findById(req.params.id, req.user.school_id));
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const existing = Module.findById(req.params.id, req.user.school_id);
    if (!existing) return res.status(404).json({ message: 'Module not found' });
    Module.remove(req.params.id, req.user.school_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

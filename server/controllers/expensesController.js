const Expense = require('../models/Expense');

exports.getAll = (req, res) => {
  const { month } = req.query;
  const rows = Expense.findAll(req.user.school_id, { month });
  res.json(rows);
};

exports.create = (req, res) => {
  const { date, category, description, amount } = req.body;
  if (!date || !amount) return res.status(400).json({ message: 'date and amount required' });

  const result = Expense.create(req.user.school_id, { date, category: category || 'other', description, amount });
  const row = Expense.findById(result.lastInsertRowid, req.user.school_id);
  res.status(201).json(row);
};

exports.update = (req, res) => {
  const { date, category, description, amount } = req.body;
  if (!date || !amount) return res.status(400).json({ message: 'date and amount required' });

  const existing = Expense.findById(req.params.id, req.user.school_id);
  if (!existing) return res.status(404).json({ message: 'Not found' });

  Expense.update(req.params.id, req.user.school_id, { date, category: category || 'other', description, amount });
  const row = Expense.findById(req.params.id, req.user.school_id);
  res.json(row);
};

exports.remove = (req, res) => {
  const existing = Expense.findById(req.params.id, req.user.school_id);
  if (!existing) return res.status(404).json({ message: 'Not found' });

  Expense.remove(req.params.id, req.user.school_id);
  res.json({ ok: true });
};

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { program_id, category } = req.query;
  let sql = 'SELECT e.*, p.name AS program_name FROM expenses e LEFT JOIN programs p ON e.program_id = p.id WHERE 1=1';
  const params = [];
  if (program_id) { sql += ' AND e.program_id = ?'; params.push(program_id); }
  if (category) { sql += ' AND e.category = ?'; params.push(category); }
  sql += ' ORDER BY e.expense_date DESC';
  const expenses = db.all(sql, params);
  const total = db.get('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses' + (program_id ? ' WHERE program_id = ?' : ''), program_id ? [program_id] : []);
  const totalIncome = db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM donations");
  const byCategory = db.all('SELECT category, COALESCE(SUM(amount), 0) AS total FROM expenses GROUP BY category ORDER BY total DESC');
  res.json({ expenses, total_expenses: total.total, total_income: totalIncome.total, by_category: byCategory });
});

router.post('/', requireAuth, (req, res) => {
  const { program_id, category, description, amount, expense_date } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'Description and amount are required' });
  db.run('INSERT INTO expenses (program_id, category, description, amount, expense_date) VALUES (?, ?, ?, ?, ?)',
    [program_id || null, category || 'Other', description, amount, expense_date || null]);
  const rows = db.all('SELECT id FROM expenses ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create expense' });
  const expense = db.get('SELECT e.*, p.name AS program_name FROM expenses e LEFT JOIN programs p ON e.program_id = p.id WHERE e.id = ?', [rows[0].id]);
  res.status(201).json({ expense });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;


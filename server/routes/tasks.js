const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { status, priority, program_id } = req.query;
  let sql = 'SELECT t.*, p.name AS program_name FROM tasks t LEFT JOIN programs p ON t.program_id = p.id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (program_id) { sql += ' AND t.program_id = ?'; params.push(program_id); }
  sql += ' ORDER BY CASE t.priority WHEN \'high\' THEN 0 WHEN \'medium\' THEN 1 ELSE 2 END, t.due_date ASC';
  const tasks = db.all(sql, params);
  const counts = db.all('SELECT status, COUNT(*) AS count FROM tasks GROUP BY status');
  res.json({ tasks, counts });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description, assigned_to, program_id, priority, status, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  db.run('INSERT INTO tasks (title, description, assigned_to, program_id, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, description || '', assigned_to || '', program_id || null, priority || 'medium', status || 'pending', due_date || null]);
  const rows = db.all('SELECT id FROM tasks ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create task' });
  const task = db.get('SELECT t.*, p.name AS program_name FROM tasks t LEFT JOIN programs p ON t.program_id = p.id WHERE t.id = ?', [rows[0].id]);
  res.status(201).json({ task });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { title, description, assigned_to, program_id, priority, status, due_date } = req.body;
  db.run('UPDATE tasks SET title=?, description=?, assigned_to=?, program_id=?, priority=?, status=?, due_date=? WHERE id=?',
    [title || existing.title, description ?? existing.description, assigned_to ?? existing.assigned_to,
     program_id ?? existing.program_id, priority || existing.priority, status || existing.status,
     due_date ?? existing.due_date, req.params.id]);
  const task = db.get('SELECT t.*, p.name AS program_name FROM tasks t LEFT JOIN programs p ON t.program_id = p.id WHERE t.id = ?', [req.params.id]);
  res.json({ task });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;


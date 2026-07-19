const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const volunteers = db.all(`
    SELECT v.*, p.name AS program_name,
      COALESCE(SUM(vh.hours), 0) AS total_hours_logged
    FROM volunteers v
    LEFT JOIN programs p ON v.program_id = p.id
    LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id
    GROUP BY v.id ORDER BY v.joined_at DESC
  `);
  const totalActive = db.get("SELECT COUNT(*) AS count FROM volunteers WHERE status = 'active'");
  const totalHours = db.get('SELECT COALESCE(SUM(hours), 0) AS total FROM volunteer_hours');
  res.json({ volunteers, total_active: totalActive.count, total_hours: totalHours.total });
});

router.get('/:id', requireAuth, (req, res) => {
  const volunteer = db.get('SELECT v.*, p.name AS program_name FROM volunteers v LEFT JOIN programs p ON v.program_id = p.id WHERE v.id = ?', [req.params.id]);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const hours = db.all('SELECT * FROM volunteer_hours WHERE volunteer_id = ? ORDER BY logged_date DESC', [req.params.id]);
  volunteer.hours_log = hours;
  res.json({ volunteer });
});

router.post('/', requireAuth, (req, res) => {
  const { name, email, phone, district, program_id, hours_committed, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO volunteers (name, email, phone, district, program_id, hours_committed, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email || '', phone || '', district || '', program_id || null, hours_committed || 0, status || 'active']);
  const rows = db.all('SELECT id FROM volunteers ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create volunteer' });
  const volunteer = db.get('SELECT * FROM volunteers WHERE id = ?', [rows[0].id]);
  res.status(201).json({ volunteer });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Volunteer not found' });
  const { name, email, phone, district, program_id, hours_committed, status } = req.body;
  db.run('UPDATE volunteers SET name=?, email=?, phone=?, district=?, program_id=?, hours_committed=?, status=? WHERE id=?',
    [name || existing.name, email ?? existing.email, phone ?? existing.phone, district ?? existing.district,
     program_id ?? existing.program_id, hours_committed ?? existing.hours_committed, status || existing.status, req.params.id]);
  const volunteer = db.get('SELECT * FROM volunteers WHERE id = ?', [req.params.id]);
  res.json({ volunteer });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM volunteers WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM volunteer_hours WHERE volunteer_id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/:id/hours', requireAuth, (req, res) => {
  const { hours, description, program_id, logged_date } = req.body;
  if (!hours) return res.status(400).json({ error: 'Hours are required' });
  db.run('INSERT INTO volunteer_hours (volunteer_id, program_id, hours, description, logged_date) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, program_id || null, hours, description || '', logged_date || null]);
  const rows = db.all('SELECT id FROM volunteer_hours ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to log hours' });
  const entry = db.get('SELECT * FROM volunteer_hours WHERE id = ?', [rows[0].id]);
  res.status(201).json({ entry });
});

module.exports = router;

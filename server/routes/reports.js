const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { district, status, program_id } = req.query;
  let sql = 'SELECT r.*, p.name AS program_name FROM field_reports r LEFT JOIN programs p ON r.program_id = p.id WHERE 1=1';
  const params = [];
  if (district) { sql += ' AND r.district = ?'; params.push(district); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (program_id) { sql += ' AND r.program_id = ?'; params.push(program_id); }
  sql += ' ORDER BY r.submitted_at DESC';
  const reports = db.all(sql, params);
  res.json({ reports });
});

router.post('/', requireAuth, (req, res) => {
  const { author_name, district, village, program_id, summary, status } = req.body;
  if (!author_name || !summary) return res.status(400).json({ error: 'Author name and summary are required' });
  db.run('INSERT INTO field_reports (author_name, district, village, program_id, summary, status) VALUES (?, ?, ?, ?, ?, ?)',
    [author_name, district || '', village || '', program_id || null, summary, status || 'ok']);
  const rows = db.all('SELECT id FROM field_reports ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create report' });
  const report = db.get('SELECT r.*, p.name AS program_name FROM field_reports r LEFT JOIN programs p ON r.program_id = p.id WHERE r.id = ?', [rows[0].id]);
  res.status(201).json({ report });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM field_reports WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Report not found' });
  const { author_name, district, village, program_id, summary, status } = req.body;
  db.run('UPDATE field_reports SET author_name=?, district=?, village=?, program_id=?, summary=?, status=? WHERE id=?',
    [author_name || existing.author_name, district ?? existing.district, village ?? existing.village,
     program_id ?? existing.program_id, summary || existing.summary, status || existing.status, req.params.id]);
  const report = db.get('SELECT r.*, p.name AS program_name FROM field_reports r LEFT JOIN programs p ON r.program_id = p.id WHERE r.id = ?', [req.params.id]);
  res.json({ report });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM field_reports WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;


const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { program_id, status, district, search } = req.query;
  let sql = 'SELECT b.*, p.name AS program_name FROM beneficiaries b LEFT JOIN programs p ON b.program_id = p.id WHERE 1=1';
  const params = [];
  if (program_id) { sql += ' AND b.program_id = ?'; params.push(program_id); }
  if (status) { sql += ' AND b.status = ?'; params.push(status); }
  if (district) { sql += ' AND b.district = ?'; params.push(district); }
  if (search) { sql += ' AND b.name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY b.enrolled_at DESC';
  const beneficiaries = db.all(sql, params);
  res.json({ beneficiaries });
});

router.get('/:id', requireAuth, (req, res) => {
  const beneficiary = db.get('SELECT b.*, p.name AS program_name FROM beneficiaries b LEFT JOIN programs p ON b.program_id = p.id WHERE b.id = ?', [req.params.id]);
  if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
  res.json({ beneficiary });
});

router.post('/', requireAuth, (req, res) => {
  const { name, age, gender, village, district, program_id, contact, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO beneficiaries (name, age, gender, village, district, program_id, contact, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, age || null, gender || '', village || '', district || '', program_id || null, contact || '', status || 'active']);
  const rows = db.all('SELECT id FROM beneficiaries ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create beneficiary' });
  const beneficiary = db.get('SELECT * FROM beneficiaries WHERE id = ?', [rows[0].id]);
  res.status(201).json({ beneficiary });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM beneficiaries WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Beneficiary not found' });
  const { name, age, gender, village, district, program_id, contact, status } = req.body;
  db.run('UPDATE beneficiaries SET name=?, age=?, gender=?, village=?, district=?, program_id=?, contact=?, status=? WHERE id=?',
    [name || existing.name, age ?? existing.age, gender ?? existing.gender, village ?? existing.village,
     district ?? existing.district, program_id ?? existing.program_id, contact ?? existing.contact,
     status || existing.status, req.params.id]);
  const beneficiary = db.get('SELECT * FROM beneficiaries WHERE id = ?', [req.params.id]);
  res.json({ beneficiary });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM beneficiaries WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;

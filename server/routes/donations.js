const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { program_id, type, donor_id } = req.query;
  let sql = 'SELECT dn.*, p.name AS program_name FROM donations dn LEFT JOIN programs p ON dn.program_id = p.id WHERE 1=1';
  const params = [];
  if (program_id) { sql += ' AND dn.program_id = ?'; params.push(program_id); }
  if (type) { sql += ' AND dn.type = ?'; params.push(type); }
  if (donor_id) { sql += ' AND dn.donor_id = ?'; params.push(donor_id); }
  sql += ' ORDER BY dn.created_at DESC';
  const donations = db.all(sql, params);
  res.json({ donations });
});

router.post('/', requireAuth, (req, res) => {
  const { donor_id, program_id, donor_name, amount, type, note } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount is required' });
  if (!donor_name && !donor_id) return res.status(400).json({ error: 'Donor name or donor_id is required' });
  const name = donor_name || db.get('SELECT name FROM donors WHERE id = ?', [donor_id])?.name || 'Unknown';
  db.run('INSERT INTO donations (donor_id, program_id, donor_name, amount, type, note) VALUES (?, ?, ?, ?, ?, ?)',
    [donor_id || null, program_id || null, name, amount, type || 'one-time', note || '']);
  const row = db.get('SELECT last_insert_rowid() AS id');
  const donation = db.get('SELECT dn.*, p.name AS program_name FROM donations dn LEFT JOIN programs p ON dn.program_id = p.id WHERE dn.id = ?', [row.id]);
  res.status(201).json({ donation });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM donations WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;

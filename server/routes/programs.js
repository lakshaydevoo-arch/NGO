const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const programs = db.all('SELECT * FROM programs ORDER BY created_at DESC');
  res.json({ programs });
});

router.get('/:id', requireAuth, (req, res) => {
  const program = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const beneficiaries = db.all('SELECT COUNT(*) AS count FROM beneficiaries WHERE program_id = ?', [req.params.id]);
  program.beneficiary_count = beneficiaries[0]?.count || 0;
  res.json({ program });
});

router.post('/', requireAuth, (req, res) => {
  const { name, description, villages, district, progress_pct, stage, target_amount, raised_amount } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO programs (name, description, villages, district, progress_pct, stage, target_amount, raised_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || '', villages || 0, district || '', progress_pct || 0, stage || 'Sown', target_amount || 0, raised_amount || 0]);
  const row = db.get('SELECT last_insert_rowid() AS id');
  const program = db.get('SELECT * FROM programs WHERE id = ?', [row.id]);
  res.status(201).json({ program });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Program not found' });
  const { name, description, villages, district, progress_pct, stage, target_amount, raised_amount } = req.body;
  db.run('UPDATE programs SET name=?, description=?, villages=?, district=?, progress_pct=?, stage=?, target_amount=?, raised_amount=? WHERE id=?',
    [name || existing.name, description ?? existing.description, villages ?? existing.villages, district ?? existing.district,
     progress_pct ?? existing.progress_pct, stage || existing.stage, target_amount ?? existing.target_amount, raised_amount ?? existing.raised_amount, req.params.id]);
  const program = db.get('SELECT * FROM programs WHERE id = ?', [req.params.id]);
  res.json({ program });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM programs WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;

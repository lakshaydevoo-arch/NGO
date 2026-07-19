const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get impact milestones
router.get('/', requireAuth, (req, res) => {
  try {
    const milestones = db.all(`
      SELECT im.*, p.name AS program_name 
      FROM impact_milestones im 
      LEFT JOIN programs p ON im.program_id = p.id 
      ORDER BY im.created_at DESC
    `);
    res.json({ milestones });
  } catch (err) {
    console.error('Failed to get impact milestones:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new milestone
router.post('/', requireAuth, (req, res) => {
  try {
    const { program_id, metric_name, target_value, achieved_value, unit } = req.body;
    if (!metric_name) return res.status(400).json({ error: 'Metric name is required' });
    
    db.run('INSERT INTO impact_milestones (program_id, metric_name, target_value, achieved_value, unit) VALUES (?, ?, ?, ?, ?)',
      [program_id || null, metric_name, target_value || 0, achieved_value || 0, unit || '']);
      
    const rows = db.all('SELECT id FROM impact_milestones ORDER BY id DESC LIMIT 1');
    if (!rows.length) return res.status(500).json({ error: 'Failed to create milestone' });
    
    const milestone = db.get('SELECT im.*, p.name AS program_name FROM impact_milestones im LEFT JOIN programs p ON im.program_id = p.id WHERE im.id = ?', [rows[0].id]);
    res.status(201).json({ milestone });
  } catch (err) {
    console.error('Failed to create milestone:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit milestone (typically to update achieved value)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.get('SELECT * FROM impact_milestones WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Milestone not found' });
    
    const { program_id, metric_name, target_value, achieved_value, unit } = req.body;
    db.run('UPDATE impact_milestones SET program_id=?, metric_name=?, target_value=?, achieved_value=?, unit=? WHERE id=?',
      [program_id ?? existing.program_id, metric_name || existing.metric_name, target_value ?? existing.target_value,
       achieved_value ?? existing.achieved_value, unit ?? existing.unit, req.params.id]);
       
    const milestone = db.get('SELECT im.*, p.name AS program_name FROM impact_milestones im LEFT JOIN programs p ON im.program_id = p.id WHERE im.id = ?', [req.params.id]);
    res.json({ milestone });
  } catch (err) {
    console.error('Failed to update milestone:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete milestone
router.delete('/:id', requireAuth, (req, res) => {
  try {
    db.run('DELETE FROM impact_milestones WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete milestone:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const announcements = db.all('SELECT * FROM announcements ORDER BY created_at DESC');
  res.json({ announcements });
});

router.post('/', requireAuth, (req, res) => {
  const { title, content, author, priority } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  db.run('INSERT INTO announcements (title, content, author, priority) VALUES (?, ?, ?, ?)',
    [title, content, author || '', priority || 'normal']);
  const rows = db.all('SELECT id FROM announcements ORDER BY id DESC LIMIT 1');
  if (!rows.length) return res.status(500).json({ error: 'Failed to create announcement' });
  const announcement = db.get('SELECT * FROM announcements WHERE id = ?', [rows[0].id]);
  res.status(201).json({ announcement });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;

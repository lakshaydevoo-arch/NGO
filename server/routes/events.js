const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get scheduled events
router.get('/', requireAuth, (req, res) => {
  try {
    const events = db.all(`
      SELECT e.*, p.name AS program_name 
      FROM events e 
      LEFT JOIN programs p ON e.program_id = p.id 
      ORDER BY e.event_date ASC
    `);
    res.json({ events });
  } catch (err) {
    console.error('Failed to get events:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new event
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, description, location, event_date, program_id, volunteer_count } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Title and event date are required' });
    
    db.run('INSERT INTO events (title, description, location, event_date, program_id, volunteer_count) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', location || '', event_date, program_id || null, volunteer_count || 0]);
      
    const rows = db.all('SELECT id FROM events ORDER BY id DESC LIMIT 1');
    if (!rows.length) return res.status(500).json({ error: 'Failed to create event' });
    
    const event = db.get('SELECT e.*, p.name AS program_name FROM events e LEFT JOIN programs p ON e.program_id = p.id WHERE e.id = ?', [rows[0].id]);
    res.status(201).json({ event });
  } catch (err) {
    console.error('Failed to create event:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit event
router.put('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    
    const { title, description, location, event_date, program_id, volunteer_count } = req.body;
    db.run('UPDATE events SET title=?, description=?, location=?, event_date=?, program_id=?, volunteer_count=? WHERE id=?',
      [title || existing.title, description ?? existing.description, location ?? existing.location,
       event_date || existing.event_date, program_id ?? existing.program_id, volunteer_count ?? existing.volunteer_count, req.params.id]);
       
    const event = db.get('SELECT e.*, p.name AS program_name FROM events e LEFT JOIN programs p ON e.program_id = p.id WHERE e.id = ?', [req.params.id]);
    res.json({ event });
  } catch (err) {
    console.error('Failed to update event:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event
router.delete('/:id', requireAuth, (req, res) => {
  try {
    db.run('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete event:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

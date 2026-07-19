const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', requireAuth, (req, res) => {
  try {
    const settings = db.all('SELECT * FROM organization_settings');
    res.json({ settings });
  } catch (err) {
    console.error('Failed to get settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.post('/', requireAuth, (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      db.run('INSERT OR REPLACE INTO organization_settings (key, value) VALUES (?, ?)', [key, value ? String(value) : '']);
    }
    const settings = db.all('SELECT * FROM organization_settings');
    res.json({ settings });
  } catch (err) {
    console.error('Failed to update settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

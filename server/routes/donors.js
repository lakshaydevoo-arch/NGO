const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const donors = db.all('SELECT d.*, COALESCE(SUM(dn.amount), 0) AS total_donated, COUNT(dn.id) AS donation_count FROM donors d LEFT JOIN donations dn ON d.id = dn.donor_id GROUP BY d.id ORDER BY d.created_at DESC');
  res.json({ donors });
});

router.get('/:id', requireAuth, (req, res) => {
  const donor = db.get('SELECT * FROM donors WHERE id = ?', [req.params.id]);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  const donations = db.all('SELECT dn.*, p.name AS program_name FROM donations dn LEFT JOIN programs p ON dn.program_id = p.id WHERE dn.donor_id = ? ORDER BY dn.created_at DESC', [req.params.id]);
  donor.donations = donations;
  res.json({ donor });
});

router.post('/', requireAuth, (req, res) => {
  const { name, email, phone, type, notes, donation_amount, donation_program_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('INSERT INTO donors (name, email, phone, type, notes) VALUES (?, ?, ?, ?, ?)',
    [name, email || '', phone || '', type || 'individual', notes || '']);
  // Get the last insert ID directly via the sql.js result
  const allDonors = db.all('SELECT id FROM donors ORDER BY id DESC LIMIT 1');
  if (!allDonors.length) return res.status(500).json({ error: 'Failed to create donor' });
  const donorId = allDonors[0].id;

  if (donation_amount && parseFloat(donation_amount) > 0) {
    const amount = parseFloat(donation_amount);
    db.run('INSERT INTO donations (donor_id, program_id, donor_name, amount, type) VALUES (?, ?, ?, ?, ?)',
      [donorId, donation_program_id || null, name, amount, 'one-time']);
  }

  const donor = db.get('SELECT * FROM donors WHERE id = ?', [donorId]);
  if (!donor) return res.status(500).json({ error: 'Donor not found after creation' });
  const totals = db.get('SELECT COALESCE(SUM(amount), 0) AS total_donated, COUNT(id) AS donation_count FROM donations WHERE donor_id = ?', [donorId]);
  donor.total_donated = totals ? totals.total_donated : 0;
  donor.donation_count = totals ? totals.donation_count : 0;
  res.status(201).json({ donor });
});

router.put('/:id', requireAuth, (req, res) => {
  const existing = db.get('SELECT * FROM donors WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Donor not found' });
  const { name, email, phone, type, notes } = req.body;
  db.run('UPDATE donors SET name=?, email=?, phone=?, type=?, notes=? WHERE id=?',
    [name || existing.name, email ?? existing.email, phone ?? existing.phone,
     type || existing.type, notes ?? existing.notes, req.params.id]);
  const donor = db.get('SELECT * FROM donors WHERE id = ?', [req.params.id]);
  res.json({ donor });
});

router.delete('/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM donors WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;

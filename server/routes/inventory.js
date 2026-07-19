const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get inventory items and basic metrics
router.get('/', requireAuth, (req, res) => {
  try {
    const items = db.all(`
      SELECT i.*, p.name AS program_name 
      FROM inventory i 
      LEFT JOIN programs p ON i.program_id = p.id 
      ORDER BY i.item_name
    `);
    const totalItems = db.get('SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory');
    const totalDist = db.get('SELECT COALESCE(SUM(quantity_distributed), 0) AS total FROM distributions');
    res.json({ items, total_in_stock: totalItems.total, total_distributed: totalDist.total });
  } catch (err) {
    console.error('Failed to get inventory:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new item or add stock to existing item
router.post('/', requireAuth, (req, res) => {
  try {
    const { item_name, quantity, unit, program_id } = req.body;
    if (!item_name) return res.status(400).json({ error: 'Item name is required' });
    
    // Check if item already exists under the same program
    const existing = db.get('SELECT * FROM inventory WHERE item_name = ? AND COALESCE(program_id, 0) = COALESCE(?, 0)', [item_name, program_id || null]);
    let itemId;
    if (existing) {
      db.run('UPDATE inventory SET quantity = quantity + ?, unit = ? WHERE id = ?', [quantity || 0, unit || existing.unit, existing.id]);
      itemId = existing.id;
    } else {
      db.run('INSERT INTO inventory (item_name, quantity, unit, program_id) VALUES (?, ?, ?, ?)', [item_name, quantity || 0, unit || '', program_id || null]);
      const rows = db.all('SELECT id FROM inventory ORDER BY id DESC LIMIT 1');
      if (!rows.length) return res.status(500).json({ error: 'Failed to create item' });
      itemId = rows[0].id;
    }
    
    const item = db.get('SELECT i.*, p.name AS program_name FROM inventory i LEFT JOIN programs p ON i.program_id = p.id WHERE i.id = ?', [itemId]);
    res.status(201).json({ item });
  } catch (err) {
    console.error('Failed to add inventory item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get distribution history
router.get('/distributions', requireAuth, (req, res) => {
  try {
    const list = db.all(`
      SELECT d.*, i.item_name, i.unit, b.name AS beneficiary_name, v.name AS volunteer_name
      FROM distributions d
      JOIN inventory i ON d.item_id = i.id
      LEFT JOIN beneficiaries b ON d.beneficiary_id = b.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      ORDER BY d.distributed_at DESC
    `);
    res.json({ distributions: list });
  } catch (err) {
    console.error('Failed to get distributions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Distribute items
router.post('/distribute', requireAuth, (req, res) => {
  try {
    const { item_id, beneficiary_id, volunteer_id, quantity_distributed, distributed_at } = req.body;
    if (!item_id || !quantity_distributed) return res.status(400).json({ error: 'Item and quantity are required' });
    
    const item = db.get('SELECT * FROM inventory WHERE id = ?', [item_id]);
    if (!item) return res.status(404).json({ error: 'Item not found in inventory' });
    if (item.quantity < quantity_distributed) return res.status(400).json({ error: 'Insufficient stock' });
    
    // Insert distribution log
    db.run('INSERT INTO distributions (item_id, beneficiary_id, volunteer_id, quantity_distributed, distributed_at) VALUES (?, ?, ?, ?, ?)',
      [item_id, beneficiary_id || null, volunteer_id || null, quantity_distributed, distributed_at || null]);
      
    // Deduct quantity from inventory
    db.run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity_distributed, item_id]);
    
    const rows = db.all('SELECT id FROM distributions ORDER BY id DESC LIMIT 1');
    if (!rows.length) return res.status(500).json({ error: 'Failed to record distribution' });
    
    const dist = db.get(`
      SELECT d.*, i.item_name, i.unit, b.name AS beneficiary_name, v.name AS volunteer_name
      FROM distributions d
      JOIN inventory i ON d.item_id = i.id
      LEFT JOIN beneficiaries b ON d.beneficiary_id = b.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      WHERE d.id = ?
    `, [rows[0].id]);
    res.status(201).json({ distribution: dist });
  } catch (err) {
    console.error('Failed to record distribution:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete inventory item
router.delete('/:id', requireAuth, (req, res) => {
  try {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete item:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete distribution entry and restore inventory stock
router.delete('/distributions/:id', requireAuth, (req, res) => {
  try {
    const dist = db.get('SELECT * FROM distributions WHERE id = ?', [req.params.id]);
    if (dist) {
      db.run('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [dist.quantity_distributed, dist.item_id]);
      db.run('DELETE FROM distributions WHERE id = ?', [req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete distribution:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

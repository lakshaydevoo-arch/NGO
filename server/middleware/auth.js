const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = db.get('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

module.exports = { requireAuth };

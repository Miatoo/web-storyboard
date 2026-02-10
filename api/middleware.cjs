const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN' });
  return next();
}

module.exports = { requireAuth, requireAdmin };












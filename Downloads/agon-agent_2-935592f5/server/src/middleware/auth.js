'use strict';
const jwt = require('jsonwebtoken');
const cfg = require('../config');

/** Verifies the Bearer JWT and attaches { id, role, email, name } to req.user */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'MISSING_TOKEN' });
  try {
    req.user = jwt.verify(token, cfg.jwt.secret);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

/** RBAC guard — usage: requireRole('admin') or requireRole('lsp', 'admin') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'MISSING_TOKEN' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN', required: roles });
    next();
  };
}

function signToken(user) {
  // Claims deliberately minimal: role lives in JWT so RBAC needs no DB lookup.
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    cfg.jwt.secret,
    { expiresIn: cfg.jwt.expiresIn }
  );
}

module.exports = { requireAuth, requireRole, signToken };

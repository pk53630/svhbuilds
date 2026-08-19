const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { users } = db.read();
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Usage: authorize('super_admin', 'admin') */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that' });
    }
    next();
  };
}

/** The list of building IDs an admin manages (supports one admin over many buildings). */
function adminBuildingIds(user) {
  if (!user) return [];
  if (Array.isArray(user.buildingIds) && user.buildingIds.length) return user.buildingIds;
  return user.buildingId ? [user.buildingId] : [];
}

/** True if the user may act on the given building. Super admin can access all. */
function hasBuildingAccess(user, buildingId) {
  if (!user || !buildingId) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return adminBuildingIds(user).includes(buildingId);
  if (user.role === 'user') return user.buildingId === buildingId;
  return false;
}

module.exports = { authenticate, authorize, JWT_SECRET, adminBuildingIds, hasBuildingAccess };

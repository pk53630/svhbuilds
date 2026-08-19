const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/** Super admin only: list all admins. */
router.get('/', authenticate, authorize('super_admin'), (req, res) => {
  const { users } = db.read();
  res.json(users.filter((u) => u.role === 'admin').map(publicUser));
});

/**
 * Normalises the buildings a request wants to assign to an admin. Accepts
 * `buildingIds` (array) or a single `buildingId`, and requires at least one.
 */
function resolveBuildingIds(body) {
  let ids = [];
  if (Array.isArray(body.buildingIds)) ids = body.buildingIds;
  else if (body.buildingId) ids = [body.buildingId];
  return [...new Set(ids.filter(Boolean))];
}

/** Super admin only: create an admin who can manage one or more buildings. */
router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const buildingIds = resolveBuildingIds(req.body || {});
  if (!name || !email || !password || buildingIds.length === 0) {
    return res.status(400).json({ error: 'name, email, password and at least one building are required' });
  }

  const data = db.read();
  const unknown = buildingIds.filter((id) => !data.buildings.some((b) => b.id === id));
  if (unknown.length) return res.status(400).json({ error: 'One or more selected buildings do not exist' });
  if (data.users.some((u) => (u.email || '').toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A user with that email already exists' });
  }

  const admin = {
    id: uuid(),
    name,
    email,
    phone: phone || '',
    role: 'admin',
    buildingIds,
    buildingId: buildingIds[0], // kept for display / backward compatibility
    flatNumber: null,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  data.users.push(admin);
  db.write(data);
  res.status(201).json(publicUser(admin));
});

/** Super admin only: change which buildings an existing admin can manage. */
router.patch('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const buildingIds = resolveBuildingIds(req.body || {});
  if (buildingIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one building for this admin' });
  }

  const data = db.read();
  const admin = data.users.find((u) => u.id === req.params.id && u.role === 'admin');
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  const unknown = buildingIds.filter((id) => !data.buildings.some((b) => b.id === id));
  if (unknown.length) return res.status(400).json({ error: 'One or more selected buildings do not exist' });

  admin.buildingIds = buildingIds;
  admin.buildingId = buildingIds[0];
  db.write(data);
  res.json(publicUser(admin));
});

/** Super admin only: remove an admin. */
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const data = db.read();
  const admin = data.users.find((u) => u.id === req.params.id && u.role === 'admin');
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  data.users = data.users.filter((u) => u.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

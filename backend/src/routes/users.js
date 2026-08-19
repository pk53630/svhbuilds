const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');

const router = express.Router();

// Password every new resident gets for their first login; they are forced to
// change it immediately after logging in. Override in .env if you like.
const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Welcome@123';

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/**
 * Admin: list residents in their building. Super admin: can pass ?buildingId=
 * to view residents of any building.
 */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { users } = db.read();
  const buildingId = req.query.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) {
    return res.status(403).json({ error: 'You do not manage that building' });
  }

  res.json(users.filter((u) => u.role === 'user' && u.buildingId === buildingId).map(publicUser));
});

/**
 * Admin: add a resident to their building.
 * - Username IS the mobile number (residents log in with it).
 * - One user per flat: the flat must exist in the building's flat list and not
 *   already have a user.
 * - Password is always the default (Welcome@123 unless overridden in .env);
 *   the resident must change it on first login.
 */
router.post('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { name, email, phone, flatNumber } = req.body || {};
  // Admin may manage several buildings, so the target building must be given
  // explicitly (the frontend always sends it); we then verify access.
  const buildingId = req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);

  if (!phone || !flatNumber || !buildingId) {
    return res.status(400).json({ error: 'mobile number, flatNumber and buildingId are required' });
  }
  if (!hasBuildingAccess(req.user, buildingId)) {
    return res.status(403).json({ error: 'You do not manage that building' });
  }

  const cleanPhone = String(phone).replace(/\s+/g, '');
  if (!/^\d{10,14}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Mobile number must be 10-14 digits (e.g. 9198xxxxxxxx)' });
  }

  const data = db.read();
  const building = data.buildings.find((b) => b.id === buildingId);
  if (!building) return res.status(400).json({ error: 'Unknown buildingId' });

  if (Array.isArray(building.flats) && building.flats.length > 0 && !building.flats.includes(flatNumber)) {
    return res.status(400).json({ error: `Flat "${flatNumber}" does not exist in ${building.name}` });
  }
  const flatTaken = data.users.some(
    (u) => u.role === 'user' && u.buildingId === buildingId && u.flatNumber === flatNumber
  );
  if (flatTaken) {
    return res.status(409).json({ error: `Flat ${flatNumber} already has a user (one user per flat)` });
  }
  if (data.users.some((u) => u.phone === cleanPhone)) {
    return res.status(409).json({ error: 'A user with that mobile number already exists' });
  }
  if (email && data.users.some((u) => (u.email || '').toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A user with that email already exists' });
  }

  const user = {
    id: uuid(),
    name: name || `Flat ${flatNumber}`,
    email: email || '',
    phone: cleanPhone,
    role: 'user',
    buildingId,
    flatNumber,
    passwordHash: bcrypt.hashSync(DEFAULT_USER_PASSWORD, 10),
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  db.write(data);
  res.status(201).json({ ...publicUser(user), defaultPassword: DEFAULT_USER_PASSWORD });
});

/** Admin: remove a resident from their building (frees up the flat). */
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const target = data.users.find((u) => u.id === req.params.id && u.role === 'user');
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!hasBuildingAccess(req.user, target.buildingId)) {
    return res.status(403).json({ error: 'You can only manage users in buildings you manage' });
  }

  data.users = data.users.filter((u) => u.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

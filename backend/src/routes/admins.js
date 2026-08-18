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

/** Super admin only: create a normal admin for a building. */
router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { name, email, phone, password, buildingId } = req.body || {};
  if (!name || !email || !password || !buildingId) {
    return res.status(400).json({ error: 'name, email, password and buildingId are required' });
  }

  const data = db.read();
  if (!data.buildings.some((b) => b.id === buildingId)) {
    return res.status(400).json({ error: 'Unknown buildingId' });
  }
  if (data.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A user with that email already exists' });
  }

  const admin = {
    id: uuid(),
    name,
    email,
    phone: phone || '',
    role: 'admin',
    buildingId,
    flatNumber: null,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  data.users.push(admin);
  db.write(data);
  res.status(201).json(publicUser(admin));
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

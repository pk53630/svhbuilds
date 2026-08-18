const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

/**
 * Login with either:
 *  - email + password (admins and the super admin), or
 *  - mobile number + password (residents — their username IS their mobile number).
 * The `email` field accepts both for backward compatibility with all three apps.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const identifier = String(email || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'email/mobile number and password are required' });
  }

  const { users } = db.read();
  const user = users.find(
    (u) =>
      (u.email || '').toLowerCase() === identifier.toLowerCase() ||
      (u.phone && u.phone === identifier.replace(/\s+/g, ''))
  );
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email/mobile number or password' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.json({ token, user: publicUser(user) });
});

/**
 * Change own password. Mandatory on first login for residents created by an
 * admin (their `mustChangePassword` flag is true until they do this).
 */
router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from the current one' });
  }

  const data = db.read();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  user.mustChangePassword = false;
  db.write(data);

  res.json({ success: true, user: publicUser(user) });
});

module.exports = router;

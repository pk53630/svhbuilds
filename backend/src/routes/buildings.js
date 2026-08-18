const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/** Everyone logged in can see the building list (scoped by role on the frontend). */
router.get('/', authenticate, (req, res) => {
  const { buildings } = db.read();
  res.json(buildings);
});

/** Super admin only: add a building. */
router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { name, code, address, image, flats } = req.body || {};
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

  const data = db.read();
  const codeUpper = String(code).toUpperCase().trim();
  if (data.buildings.some((b) => b.code === codeUpper)) {
    return res.status(409).json({ error: `Building code "${codeUpper}" is already in use` });
  }

  const building = {
    id: uuid(),
    name: name.trim(),
    code: codeUpper,
    address: address || '',
    // Optional filename of a photo placed in the project's Images folder,
    // e.g. "SVresidency.jpg" — served by the backend at /images/<filename>.
    image: image || null,
    // List of valid flat numbers for this building (one user allowed per flat).
    flats: Array.isArray(flats) ? flats : [],
    createdAt: new Date().toISOString(),
  };
  data.buildings.push(building);
  db.write(data);
  res.status(201).json(building);
});

/** Super admin only: delete a building (and cascade-remove its users/tickets). */
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const data = db.read();
  const building = data.buildings.find((b) => b.id === req.params.id);
  if (!building) return res.status(404).json({ error: 'Building not found' });

  data.buildings = data.buildings.filter((b) => b.id !== req.params.id);
  data.users = data.users.filter((u) => u.buildingId !== req.params.id);
  data.tickets = data.tickets.filter((t) => t.buildingId !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

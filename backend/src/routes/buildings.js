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

const MAX_BUILDING_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

/** Validates an optional uploaded photo (base64 data URL). Returns it or null. */
function validateBuildingImage(imageData) {
  if (!imageData) return null;
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(String(imageData));
  if (!match) throw new Error('Building photo must be a JPEG, PNG, or WebP image');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BUILDING_IMAGE_BYTES) throw new Error('Building photo must be 3 MB or smaller');
  return imageData;
}

/** Super admin only: add a building. */
router.post('/', authenticate, authorize('super_admin'), (req, res) => {
  const { name, code, address, image, imageData, flats } = req.body || {};
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

  const data = db.read();
  const codeUpper = String(code).toUpperCase().trim();
  if (data.buildings.some((b) => b.code === codeUpper)) {
    return res.status(409).json({ error: `Building code "${codeUpper}" is already in use` });
  }

  let photo;
  try {
    photo = validateBuildingImage(imageData);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const building = {
    id: uuid(),
    name: name.trim(),
    code: codeUpper,
    address: address || '',
    // Optional filename of a photo placed in the project's Images folder,
    // e.g. "SVresidency.jpg" — served by the backend at /images/<filename>.
    image: image || null,
    // Optional uploaded photo stored inline (base64 data URL). Used when the
    // super admin uploads a picture from the browser (works on cloud hosting
    // where they can't drop files into the server's Images folder).
    imageData: photo,
    // List of valid flat numbers for this building (one user allowed per flat).
    flats: Array.isArray(flats) ? flats : [],
    createdAt: new Date().toISOString(),
  };
  data.buildings.push(building);
  db.write(data);
  res.status(201).json(building);
});

/** Super admin only: update a building's photo / details. */
router.patch('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const { name, address, image, imageData, flats } = req.body || {};
  const data = db.read();
  const building = data.buildings.find((b) => b.id === req.params.id);
  if (!building) return res.status(404).json({ error: 'Building not found' });

  if (imageData !== undefined) {
    try {
      building.imageData = validateBuildingImage(imageData);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  if (name !== undefined) building.name = String(name).trim();
  if (address !== undefined) building.address = address;
  if (image !== undefined) building.image = image || null;
  if (Array.isArray(flats)) building.flats = flats;

  db.write(data);
  res.json(building);
});

/** Super admin only: delete a building (and cascade-remove its users/tickets). */
router.delete('/:id', authenticate, authorize('super_admin'), (req, res) => {
  const data = db.read();
  const building = data.buildings.find((b) => b.id === req.params.id);
  if (!building) return res.status(404).json({ error: 'Building not found' });

  const id = req.params.id;
  data.buildings = data.buildings.filter((b) => b.id !== id);
  // Remove residents of this building, but keep admins — just revoke their
  // access to this one building (they may manage others).
  data.users = data.users.filter((u) => !(u.role === 'user' && u.buildingId === id));
  data.users.forEach((u) => {
    if (u.role === 'admin' && Array.isArray(u.buildingIds)) {
      u.buildingIds = u.buildingIds.filter((bid) => bid !== id);
      if (u.buildingId === id) u.buildingId = u.buildingIds[0] || null;
    }
  });
  data.tickets = data.tickets.filter((t) => t.buildingId !== id);
  if (Array.isArray(data.waitlist)) data.waitlist = data.waitlist.filter((w) => w.buildingId !== id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

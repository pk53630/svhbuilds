const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');
const { logNotification } = require('../utils/notifications');

const router = express.Router();

/**
 * Waiting list / interested-candidates list per building.
 * A building admin (or super admin) maintains people who want a flat but none
 * is currently available. When a flat vacates, the admin can trigger a
 * WhatsApp broadcast to everyone on that building's list.
 */

function readWaitlist(data) {
  if (!Array.isArray(data.waitlist)) data.waitlist = [];
  return data.waitlist;
}

/**
 * Which building this request is scoped to. The frontend always sends a
 * buildingId (admins can manage several); we fall back to an admin's first
 * building for safety, then verify access in each handler.
 */
function scopedBuildingId(req) {
  return req.query.buildingId || req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
}

/** GET /api/waitlist?buildingId= — list interested candidates for a building. */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) {
    return res.status(403).json({ error: 'You do not manage that building' });
  }

  const data = db.read();
  const list = readWaitlist(data)
    .filter((w) => w.buildingId === buildingId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(list);
});

/** POST /api/waitlist — add an interested candidate. */
router.post('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { name, phone, note } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) {
    return res.status(403).json({ error: 'You do not manage that building' });
  }
  if (!name || !phone) return res.status(400).json({ error: 'name and mobile number are required' });

  const cleanPhone = String(phone).replace(/\s+/g, '');
  if (!/^\d{10,14}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Mobile number must be 10-14 digits (e.g. 9198xxxxxxxx)' });
  }

  const data = db.read();
  const building = data.buildings.find((b) => b.id === buildingId);
  if (!building) return res.status(400).json({ error: 'Unknown buildingId' });

  const list = readWaitlist(data);
  if (list.some((w) => w.buildingId === buildingId && w.phone === cleanPhone)) {
    return res.status(409).json({ error: 'That mobile number is already on this waiting list' });
  }

  const entry = {
    id: uuid(),
    buildingId,
    name: name.trim(),
    phone: cleanPhone,
    note: (note || '').trim(),
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  db.write(data);
  res.status(201).json(entry);
});

/** DELETE /api/waitlist/:id — remove a candidate. */
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const list = readWaitlist(data);
  const entry = list.find((w) => w.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Waiting list entry not found' });
  if (!hasBuildingAccess(req.user, entry.buildingId)) {
    return res.status(403).json({ error: 'You can only manage waiting lists for buildings you manage' });
  }

  data.waitlist = list.filter((w) => w.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

/**
 * POST /api/waitlist/notify — a flat has vacated; broadcast to everyone on the
 * building's waiting list. Body: { buildingId?, flatNumber?, message? }.
 * Returns a wa.me link per candidate (pre-filled) that the admin's browser
 * opens so they can send from their own WhatsApp — no WhatsApp Business API
 * credentials needed. Also logs the broadcast.
 */
router.post('/notify', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { flatNumber, message } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) {
    return res.status(403).json({ error: 'You do not manage that building' });
  }

  const data = db.read();
  const building = data.buildings.find((b) => b.id === buildingId);
  if (!building) return res.status(400).json({ error: 'Unknown buildingId' });

  const list = readWaitlist(data).filter((w) => w.buildingId === buildingId);
  if (list.length === 0) return res.status(400).json({ error: 'No one is on this waiting list yet' });

  const text =
    message && message.trim()
      ? message.trim()
      : `Good news! A flat${flatNumber ? ` (${flatNumber})` : ''} is now available at ` +
        `${building.name}. You had shown interest — please contact the building admin if you ` +
        `would still like it.`;

  const recipients = list.map((w) => ({
    id: w.id,
    name: w.name,
    phone: w.phone,
    whatsappUrl: `https://wa.me/${w.phone}?text=${encodeURIComponent(text)}`,
  }));

  logNotification(
    `WAITLIST BROADCAST (${building.name}${flatNumber ? `, flat ${flatNumber}` : ''}) -> ` +
      `${recipients.length} candidate(s): ${text.replace(/\n/g, ' ')}`
  );

  res.json({ count: recipients.length, message: text, recipients });
});

module.exports = router;

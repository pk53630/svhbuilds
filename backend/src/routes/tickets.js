const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { notifyTicketEvent, buildTechnicianWhatsAppLink } = require('../utils/notifications');
const { technicianPhoneFor } = require('../config/technicians');

const router = express.Router();

const CATEGORIES = [
  'Plumbing',
  'Carpentry',
  'Electricity',
  'Water Issue',
  'Internet Not Working',
  'Lift Not Working',
  'Backup Power Issue',
  'Cleaning',
  'Access Not Working',
  'Washing Machine',
  'Others',
];

function wordCount(str) {
  return String(str || '').trim().split(/\s+/).filter(Boolean).length;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB each

/**
 * Validates base64 data-URL images (e.g. "data:image/jpeg;base64,...") and
 * returns them for storage inside the ticket record itself. Storing them in
 * the database (rather than on disk) means they survive restarts on free
 * hosting tiers, where the server's local disk is wiped on every restart.
 */
function validateTicketImages(images) {
  if (!Array.isArray(images) || images.length === 0) return [];
  if (images.length > MAX_IMAGES) {
    throw new Error(`You can attach up to ${MAX_IMAGES} images`);
  }
  return images.map((dataUrl) => {
    const match = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(String(dataUrl));
    if (!match) throw new Error('Images must be JPEG, PNG, or WebP');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Each image must be 2 MB or smaller');
    return dataUrl;
  });
}

/**
 * List tickets, scoped by role:
 *  - user: only their own tickets
 *  - admin: all tickets for their building
 *  - super_admin: all tickets (optionally filter with ?buildingId=)
 * Optional ?status=open|in_progress|closed filter for all roles.
 */
router.get('/', authenticate, (req, res) => {
  const { tickets } = db.read();
  let scoped;

  if (req.user.role === 'user') {
    scoped = tickets.filter((t) => t.userId === req.user.id);
  } else if (req.user.role === 'admin') {
    scoped = tickets.filter((t) => t.buildingId === req.user.buildingId);
  } else {
    scoped = req.query.buildingId
      ? tickets.filter((t) => t.buildingId === req.query.buildingId)
      : tickets;
  }

  if (req.query.status) {
    scoped = scoped.filter((t) => t.status === req.query.status);
  }

  res.json(scoped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.get('/categories', authenticate, (req, res) => {
  res.json(CATEGORIES);
});

router.get('/:id', authenticate, (req, res) => {
  const { tickets } = db.read();
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const allowed =
    req.user.role === 'super_admin' ||
    (req.user.role === 'admin' && ticket.buildingId === req.user.buildingId) ||
    (req.user.role === 'user' && ticket.userId === req.user.id);
  if (!allowed) return res.status(403).json({ error: 'Not allowed to view this ticket' });

  res.json(ticket);
});

/**
 * User: raise a new maintenance request for their building/flat.
 * Only the issue category is required — description (max 50 words) and
 * images (max 3, base64 data URLs) are both optional.
 */
router.post('/', authenticate, authorize('user'), async (req, res) => {
  const { category, description, images } = req.body || {};
  if (!category || !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
  }
  if (description && wordCount(description) > 50) {
    return res.status(400).json({ error: 'description must be 50 words or fewer' });
  }

  const data = db.read();
  const building = data.buildings.find((b) => b.id === req.user.buildingId);
  if (!building) return res.status(400).json({ error: 'Your account is not linked to a building' });

  const ticketNumber = generateTicketNumber(building.code);

  let imagePaths;
  try {
    imagePaths = validateTicketImages(images);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const ticket = {
    id: uuid(),
    ticketNumber,
    buildingId: building.id,
    buildingName: building.name,
    userId: req.user.id,
    flatNumber: req.user.flatNumber,
    category,
    description: (description || '').trim(),
    images: imagePaths,
    status: 'open', // open | in_progress | closed
    resolutionNotes: null,
    technicianPhone: null,
    technicianNotifiedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
  };
  data.tickets.push(ticket);
  db.write(data);

  const admins = data.users.filter((u) => u.role === 'admin' && u.buildingId === building.id);
  const superAdmins = data.users.filter((u) => u.role === 'super_admin');
  await notifyTicketEvent({
    ticket,
    building,
    resident: req.user,
    admins,
    superAdmins,
    subject: `New service request ${ticket.ticketNumber} - ${building.name}`,
  });

  res.status(201).json(ticket);
});

/**
 * Admin/super admin: trigger a WhatsApp message to the technician responsible
 * for this ticket's category (per docs/DATA_MODEL.md technician mapping).
 * Returns a wa.me link for the frontend to open in a new tab — the admin
 * still presses "Send" in WhatsApp, so no WhatsApp Business API credentials
 * are needed for this to work today.
 */
router.post('/:id/notify-technician', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const ticket = data.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'admin' && ticket.buildingId !== req.user.buildingId) {
    return res.status(403).json({ error: 'You can only manage tickets for your own building' });
  }

  const building = data.buildings.find((b) => b.id === ticket.buildingId);
  const phone = technicianPhoneFor(ticket.category);
  const whatsappUrl = buildTechnicianWhatsAppLink(phone, ticket, building);

  ticket.technicianPhone = phone;
  ticket.technicianNotifiedAt = new Date().toISOString();
  db.write(data);

  res.json({ whatsappUrl, technicianPhone: phone, ticket });
});

/** Admin/super admin: update status (e.g. move to in_progress, or close with resolution notes). */
router.patch('/:id/status', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  const { status, resolutionNotes } = req.body || {};
  if (!['open', 'in_progress', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'status must be open, in_progress, or closed' });
  }
  if (status === 'closed' && (!resolutionNotes || !resolutionNotes.trim())) {
    return res.status(400).json({ error: 'resolutionNotes are required to close a ticket' });
  }

  const data = db.read();
  const ticket = data.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'admin' && ticket.buildingId !== req.user.buildingId) {
    return res.status(403).json({ error: 'You can only manage tickets for your own building' });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  if (status === 'closed') {
    ticket.resolutionNotes = resolutionNotes.trim();
    ticket.closedAt = new Date().toISOString();
  }
  db.write(data);

  const building = data.buildings.find((b) => b.id === ticket.buildingId);
  const resident = data.users.find((u) => u.id === ticket.userId);
  const admins = data.users.filter((u) => u.role === 'admin' && u.buildingId === ticket.buildingId);
  const superAdmins = data.users.filter((u) => u.role === 'super_admin');
  await notifyTicketEvent({
    ticket,
    building,
    resident,
    admins,
    superAdmins,
    subject: `Update on service request ${ticket.ticketNumber}: now ${status}`,
  });

  res.json(ticket);
});

module.exports = router;

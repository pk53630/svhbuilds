const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');

const router = express.Router();
const TYPES = ['generator', 'lift'];

function scopedBuildingId(req) {
  return req.query.buildingId || req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
}

/** GET /api/maintenance?buildingId=&type=generator|lift — history, newest first. */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const { maintenanceRecords } = db.read();
  let list = maintenanceRecords.filter((r) => r.buildingId === buildingId);
  if (req.query.type) list = list.filter((r) => r.type === req.query.type);
  list.sort((a, b) => new Date(b.lastServiceDate) - new Date(a.lastServiceDate));
  res.json(list);
});

/** POST /api/maintenance — log a service and its next due date. */
router.post('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { type, lastServiceDate, nextServiceDate, notes } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
  if (!lastServiceDate || isNaN(new Date(lastServiceDate).getTime())) {
    return res.status(400).json({ error: 'A valid lastServiceDate is required' });
  }
  if (!nextServiceDate || isNaN(new Date(nextServiceDate).getTime())) {
    return res.status(400).json({ error: 'A valid nextServiceDate is required' });
  }

  const data = db.read();
  const record = {
    id: uuid(),
    buildingId,
    type,
    lastServiceDate: new Date(lastServiceDate).toISOString(),
    nextServiceDate: new Date(nextServiceDate).toISOString(),
    notes: (notes || '').trim(),
    notifiedAt: null, // set when the 3-day-before reminder has been sent
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };
  data.maintenanceRecords.push(record);
  db.write(data);
  res.status(201).json(record);
});

/** DELETE /api/maintenance/:id */
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const record = data.maintenanceRecords.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (!hasBuildingAccess(req.user, record.buildingId)) return res.status(403).json({ error: 'Not allowed' });

  data.maintenanceRecords = data.maintenanceRecords.filter((r) => r.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

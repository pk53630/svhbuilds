const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');
const { countByYear } = require('../utils/reports');

const router = express.Router();

function scopedBuildingId(req) {
  return req.query.buildingId || req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
}

/** GET /api/diesel?buildingId= — list records, newest first. */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const { dieselRecords } = db.read();
  const list = dieselRecords
    .filter((r) => r.buildingId === buildingId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(list);
});

/** GET /api/diesel/report?buildingId= — fillings per year, last 3 years. */
router.get('/report', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const { dieselRecords } = db.read();
  const records = dieselRecords.filter((r) => r.buildingId === buildingId);
  res.json(countByYear(records, 3));
});

/** POST /api/diesel — log a diesel fill-up for the generator (date may be in the past). */
router.post('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { liters, date, amount } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });
  if (!liters || isNaN(liters) || Number(liters) <= 0) {
    return res.status(400).json({ error: 'liters must be a positive number' });
  }
  if (!date || isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: 'A valid date is required' });
  }
  if (amount !== undefined && amount !== null && amount !== '' && (isNaN(amount) || Number(amount) < 0)) {
    return res.status(400).json({ error: 'amount must be a non-negative number' });
  }

  const data = db.read();
  const record = {
    id: uuid(),
    buildingId,
    liters: Number(liters),
    date: new Date(date).toISOString(),
    amount: amount === undefined || amount === null || amount === '' ? null : Number(amount),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };
  data.dieselRecords.push(record);
  db.write(data);
  res.status(201).json(record);
});

/** DELETE /api/diesel/:id */
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const record = data.dieselRecords.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (!hasBuildingAccess(req.user, record.buildingId)) return res.status(403).json({ error: 'Not allowed' });

  data.dieselRecords = data.dieselRecords.filter((r) => r.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

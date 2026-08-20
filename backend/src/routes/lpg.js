const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');
const { countByYear } = require('../utils/reports');

const router = express.Router();

// Fixed dropdown of floor series, per spec.
const FLOOR_SERIES = ['1', '2', '3', '4', '5', '6'];

function scopedBuildingId(req) {
  return req.query.buildingId || req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
}

router.get('/floor-series', authenticate, (req, res) => res.json(FLOOR_SERIES));

/** GET /api/lpg?buildingId= — list records, newest first. */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const { lpgRecords } = db.read();
  const list = lpgRecords
    .filter((r) => r.buildingId === buildingId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(list);
});

/** GET /api/lpg/report?buildingId= — fillings per year, last 3 years. */
router.get('/report', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const { lpgRecords } = db.read();
  const records = lpgRecords.filter((r) => r.buildingId === buildingId);
  res.json(countByYear(records, 3));
});

/** POST /api/lpg — log an LPG cylinder purchase (date may be in the past). */
router.post('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { floorSeries, date, amount } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });
  if (!floorSeries || !FLOOR_SERIES.includes(String(floorSeries))) {
    return res.status(400).json({ error: `floorSeries must be one of: ${FLOOR_SERIES.join(', ')}` });
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
    floorSeries: String(floorSeries),
    date: new Date(date).toISOString(),
    amount: amount === undefined || amount === null || amount === '' ? null : Number(amount),
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };
  data.lpgRecords.push(record);
  db.write(data);
  res.status(201).json(record);
});

/** DELETE /api/lpg/:id */
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const data = db.read();
  const record = data.lpgRecords.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (!hasBuildingAccess(req.user, record.buildingId)) return res.status(403).json({ error: 'Not allowed' });

  data.lpgRecords = data.lpgRecords.filter((r) => r.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

module.exports = router;

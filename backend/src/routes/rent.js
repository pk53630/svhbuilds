const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authenticate, authorize, hasBuildingAccess } = require('../middleware/auth');
const { lastMonthKeys, monthLabel } = require('../utils/reports');

const router = express.Router();

function scopedBuildingId(req) {
  return req.query.buildingId || req.body.buildingId || (req.user.role === 'admin' ? req.user.buildingId : null);
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * GET /api/rent?buildingId=&month=YYYY-MM — the rent checklist: every
 * resident in the building with whether that month's rent is marked received.
 * Defaults to the current month.
 */
router.get('/', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const month = req.query.month || currentMonthKey();
  const data = db.read();
  const residents = data.users.filter((u) => u.role === 'user' && u.buildingId === buildingId);

  const list = residents
    .map((u) => {
      const record = data.rentRecords.find(
        (r) => r.buildingId === buildingId && r.flatNumber === u.flatNumber && r.month === month
      );
      return {
        flatNumber: u.flatNumber,
        userId: u.id,
        name: u.name,
        phone: u.phone,
        received: !!(record && record.received),
        receivedAt: record?.receivedAt || null,
      };
    })
    .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }));

  res.json({ month, list });
});

/** PATCH /api/rent/toggle — mark a flat's rent received/not received for a month. */
router.patch('/toggle', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const { flatNumber, month, received } = req.body || {};
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });
  if (!flatNumber || !month) return res.status(400).json({ error: 'flatNumber and month (YYYY-MM) are required' });

  const data = db.read();
  let record = data.rentRecords.find(
    (r) => r.buildingId === buildingId && r.flatNumber === flatNumber && r.month === month
  );
  if (!record) {
    record = { id: uuid(), buildingId, flatNumber, month, received: false, receivedAt: null, notifiedAt: null };
    data.rentRecords.push(record);
  }
  record.received = !!received;
  record.receivedAt = record.received ? new Date().toISOString() : null;
  db.write(data);
  res.json(record);
});

/** GET /api/rent/report?buildingId= — number of residents delayed, last 4 months. */
router.get('/report', authenticate, authorize('admin', 'super_admin'), (req, res) => {
  const buildingId = scopedBuildingId(req);
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  if (!hasBuildingAccess(req.user, buildingId)) return res.status(403).json({ error: 'You do not manage that building' });

  const data = db.read();
  const residents = data.users.filter((u) => u.role === 'user' && u.buildingId === buildingId);
  const months = lastMonthKeys(4);

  const result = months.map((month) => {
    const delayed = residents.filter((u) => {
      const record = data.rentRecords.find(
        (r) => r.buildingId === buildingId && r.flatNumber === u.flatNumber && r.month === month
      );
      return !(record && record.received);
    }).length;
    return { label: monthLabel(month), value: delayed };
  });

  res.json(result);
});

module.exports = router;

/**
 * Due-date checks that would normally run on a schedule:
 *  - Generator/Lift maintenance: notify 3 days before the next service date.
 *  - Rent: after the 5th of the month, notify anyone whose flat isn't yet
 *    marked as paid for the current month.
 *
 * Runs automatically every hour while the server is awake (see server.js),
 * and can also be triggered on demand via POST /api/cron/run-checks — handy
 * on free hosting where the server sleeps when idle. Pair with a free
 * external pinger (e.g. cron-job.org) hitting that endpoint daily; see
 * deploy/FREE_SETUP_GUIDE.md.
 */
const { v4: uuid } = require('uuid');
const db = require('../db');
const { notifyUsers } = require('./notifications');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / MS_PER_DAY);
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TYPE_LABEL = { generator: 'Generator', lift: 'Lift' };

/** Notify once, 0-3 days before each building's latest known next-service date. */
async function checkMaintenanceReminders(data) {
  let notified = 0;

  for (const type of ['generator', 'lift']) {
    const byBuilding = {};
    data.maintenanceRecords
      .filter((r) => r.type === type)
      .forEach((r) => {
        const latest = byBuilding[r.buildingId];
        if (!latest || new Date(r.nextServiceDate) > new Date(latest.nextServiceDate)) {
          byBuilding[r.buildingId] = r;
        }
      });

    for (const record of Object.values(byBuilding)) {
      const days = daysUntil(record.nextServiceDate);
      if (days >= 0 && days <= 3 && !record.notifiedAt) {
        const building = data.buildings.find((b) => b.id === record.buildingId);
        if (!building) continue;
        const admins = data.users.filter(
          (u) => u.role === 'admin' && (u.buildingIds || [u.buildingId]).includes(building.id)
        );
        const superAdmins = data.users.filter((u) => u.role === 'super_admin');
        const message =
          `${TYPE_LABEL[type]} maintenance due soon\n` +
          `Building: ${building.name}\n` +
          `Next service date: ${new Date(record.nextServiceDate).toLocaleDateString()}\n` +
          (days === 0 ? 'That is today.' : `That is in ${days} day${days === 1 ? '' : 's'}.`);
        await notifyUsers([...admins, ...superAdmins], `${TYPE_LABEL[type]} maintenance due soon — ${building.name}`, message);
        record.notifiedAt = new Date().toISOString();
        notified += 1;
      }
    }
  }
  return notified;
}

/** After the 5th of the month, remind residents (and admins) whose rent isn't marked received. */
async function checkRentReminders(data) {
  const today = new Date();
  if (today.getDate() <= 5) return 0; // grace window: 1st-5th

  const month = currentMonthKey();
  let notified = 0;

  const residents = data.users.filter((u) => u.role === 'user');
  for (const resident of residents) {
    let record = data.rentRecords.find(
      (r) => r.buildingId === resident.buildingId && r.flatNumber === resident.flatNumber && r.month === month
    );
    if (record && record.received) continue; // paid, nothing to do
    if (record && record.notifiedAt) continue; // already reminded this month

    const building = data.buildings.find((b) => b.id === resident.buildingId);
    if (!building) continue;

    if (!record) {
      record = {
        id: uuid(),
        buildingId: resident.buildingId,
        flatNumber: resident.flatNumber,
        month,
        received: false,
        receivedAt: null,
        notifiedAt: null,
      };
      data.rentRecords.push(record);
    }

    const admins = data.users.filter(
      (u) => u.role === 'admin' && (u.buildingIds || [u.buildingId]).includes(building.id)
    );
    const message =
      `Rent reminder — ${building.name}, Flat ${resident.flatNumber}\n` +
      `Rent for ${month} has not been marked as received yet. Please arrange payment as soon as possible.`;
    await notifyUsers([resident, ...admins], `Rent not received — ${month} — Flat ${resident.flatNumber}`, message);
    record.notifiedAt = new Date().toISOString();
    notified += 1;
  }
  return notified;
}

async function runDueChecks() {
  const data = db.read();
  const maintenanceCount = await checkMaintenanceReminders(data);
  const rentCount = await checkRentReminders(data);
  await db.write(data);
  return { maintenanceReminders: maintenanceCount, rentReminders: rentCount };
}

module.exports = { runDueChecks };

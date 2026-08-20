require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Safety net: log unexpected errors instead of letting them crash the whole
// server (the Postgres pool has its own handler for the common case — see
// db.js — this covers anything else).
process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled promise rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const adminRoutes = require('./routes/admins');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const waitlistRoutes = require('./routes/waitlist');
const lpgRoutes = require('./routes/lpg');
const dieselRoutes = require('./routes/diesel');
const maintenanceRoutes = require('./routes/maintenance');
const rentRoutes = require('./routes/rent');
const { authenticate, authorize } = require('./middleware/auth');
const { runDueChecks } = require('./utils/cron');

const path = require('path');

const app = express();
app.use(cors());
// Larger limit so requests can include photos (sent as base64 by the apps).
app.use(express.json({ limit: '20mb' }));

// Building photos live in the project's Images folder (e.g. SVresidency.jpg).
app.use('/images', express.static(path.join(__dirname, '..', '..', 'Images')));
// Photos attached to service requests are saved here by the tickets route.
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/lpg', lpgRoutes);
app.use('/api/diesel', dieselRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/rent', rentRoutes);

/**
 * Runs the maintenance/rent due-date checks. Admins/super admin can trigger
 * it manually from the app; it also runs automatically every hour (below)
 * and can be pinged by a free external scheduler on hosts that sleep when
 * idle — see deploy/FREE_SETUP_GUIDE.md.
 */
app.post('/api/cron/run-checks', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const result = await runDueChecks();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Due-checks failed:', err);
    res.status(500).json({ error: 'Due-checks failed' });
  }
});

// Central error handler as a safety net.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const db = require('./db');
const { buildSeedData } = require('./seedData');

const PORT = process.env.PORT || 4000;
db.init().then(async () => {
  // On free hosting there's no shell to run `npm run seed`, so with
  // SEED_IF_EMPTY=true the server seeds the demo data automatically the first
  // time it starts against an empty database (and never overwrites real data).
  if (process.env.SEED_IF_EMPTY === 'true' && db.read().users.length === 0) {
    await db.write(buildSeedData());
    console.log('[seed] Database was empty — loaded demo data (SEED_IF_EMPTY=true)');
  }
  app.listen(PORT, () => {
    console.log(`Building Maintenance API listening on http://localhost:${PORT}`);
  });

  // Re-check maintenance/rent due dates every hour while the server is awake.
  // On free hosting the server sleeps when idle; ping /api/health regularly
  // (e.g. via a free cron pinger) to keep it awake so this keeps firing —
  // see deploy/FREE_SETUP_GUIDE.md.
  runDueChecks().catch((err) => console.error('Initial due-checks failed:', err));
  setInterval(() => {
    runDueChecks().catch((err) => console.error('Scheduled due-checks failed:', err));
  }, 60 * 60 * 1000);
}).catch((err) => {
  console.error('Failed to initialise storage:', err);
  process.exit(1);
});

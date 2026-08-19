require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const adminRoutes = require('./routes/admins');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const waitlistRoutes = require('./routes/waitlist');

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
}).catch((err) => {
  console.error('Failed to initialise storage:', err);
  process.exit(1);
});

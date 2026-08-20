/**
 * Data storage with two modes, chosen automatically:
 *
 *  - LOCAL (no DATABASE_URL set): stores everything in backend/data/db.json,
 *    exactly as before. Zero setup for local development.
 *
 *  - CLOUD (DATABASE_URL set, e.g. a free Neon Postgres connection string):
 *    stores the same JSON in a single Postgres row. This is what makes free
 *    hosting (Render etc.) work — free servers wipe their local disk on every
 *    restart, but the Postgres data survives.
 *
 * Both modes keep the whole state in memory, so read() stays synchronous and
 * none of the route code needs to change. write() persists in the background
 * (file write locally, Postgres UPSERT in cloud mode) and returns a promise
 * for callers that want to await it (the seed script does).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const EMPTY = {
  users: [],
  buildings: [],
  tickets: [],
  waitlist: [],
  lpgRecords: [],
  dieselRecords: [],
  maintenanceRecords: [],
  rentRecords: [],
};

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;
let cache = null;

/** Backfills any collections added in later versions (e.g. existing cloud data predating a feature). */
function normalize(data) {
  Object.keys(EMPTY).forEach((key) => {
    if (!Array.isArray(data[key])) data[key] = [];
  });
  return data;
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
}

/** Must be awaited once at startup (server.js and seed.js do this). */
async function init() {
  if (usePostgres) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Neon/Supabase require SSL
    });
    // IMPORTANT: free databases like Neon suspend their compute after a few
    // idle minutes and drop open connections. When that happens, pg's Pool
    // emits an 'error' event on an idle client — with no listener, Node
    // treats that as an uncaught exception and crashes the whole server.
    // This handler just logs it; the pool transparently opens a fresh
    // connection on the next query.
    pool.on('error', (err) => {
      console.error('[db] Postgres pool idle-connection error (recovered):', err.message);
    });
    await pool.query(
      'CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, data JSONB NOT NULL)'
    );
    const result = await pool.query('SELECT data FROM app_state WHERE id = 1');
    if (result.rows.length > 0) {
      cache = normalize(result.rows[0].data);
    } else {
      cache = JSON.parse(JSON.stringify(EMPTY));
      await pool.query('INSERT INTO app_state (id, data) VALUES (1, $1)', [cache]);
    }
    console.log('[db] Using Postgres (DATABASE_URL is set)');
  } else {
    ensureFile();
    cache = normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')));
    console.log('[db] Using local file storage (backend/data/db.json)');
  }
}

function read() {
  if (cache) return cache;
  if (usePostgres) {
    throw new Error('db.init() must be awaited before use when DATABASE_URL is set');
  }
  ensureFile();
  cache = normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')));
  return cache;
}

function write(data) {
  cache = data;
  if (usePostgres) {
    return pool
      .query('UPDATE app_state SET data = $1 WHERE id = 1', [data])
      .catch((err) => console.error('[db] Postgres write failed:', err.message));
  }
  ensureFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  return Promise.resolve();
}

module.exports = { init, read, write };

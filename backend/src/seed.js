/**
 * Seeds the database with demo data (5 buildings, super admin, admins,
 * demo residents, a sample ticket). Run with: npm run seed
 * WARNING: replaces all existing data.
 */
require('dotenv').config();
const db = require('./db');
const { buildSeedData } = require('./seedData');

async function main() {
  await db.init();
  const data = buildSeedData();
  await db.write(data);

  console.log('Seed complete.');
  console.log('Super admin login: ks2.praveen@gmail.com / Admin@123');
  data.buildings.forEach((b) => {
    console.log(`  ${b.name} (${b.code}) admin: admin.${b.code.toLowerCase()}@example.com / Admin@123`);
  });
  console.log('Sample resident login (mobile number as username): 9000000001 / User@123 (Flat 101, SV RESIDENCY)');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

/**
 * Builds the demo dataset: 5 real buildings with flat lists and photos, the
 * super admin, one admin + one demo resident per building, and a sample ticket.
 * Used by `npm run seed` and by the server's SEED_IF_EMPTY=true option
 * (handy on free hosting where there's no shell to run the seed script).
 */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

/** Builds flat lists like 101..104, 201..204 ... for the given floors/units, plus extras. */
function flats(floors, unitsPerFloor, extras = []) {
  const list = [];
  for (let f = 1; f <= floors; f++) {
    for (let u = 1; u <= unitsPerFloor; u++) {
      list.push(`${f}0${u}`);
    }
  }
  return [...list, ...extras];
}

function buildSeedData() {
  const now = () => new Date().toISOString();

  const buildings = [
    { id: uuid(), name: 'SV RESIDENCY', code: 'SV', address: '', image: 'SVresidency.jpg',
      flats: flats(5, 4), createdAt: now() },
    { id: uuid(), name: 'LAASYA HOMES', code: 'LH', address: '', image: 'LasyaHomes.jpg',
      flats: flats(5, 5, ['P-1', 'P-2']), createdAt: now() },
    { id: uuid(), name: 'TECH PRO', code: 'TP', address: '', image: 'TechPro.jpg',
      flats: flats(5, 6, ['P-1', 'P-2', 'G-1', 'S-1']), createdAt: now() },
    { id: uuid(), name: 'SRI SIRI RESIDENCY', code: 'SSR', address: '', image: 'SriSiri.jpg',
      flats: flats(5, 6, ['P-1', 'P-2', 'G-1', 'S-1']), createdAt: now() },
    { id: uuid(), name: 'Urban Stays', code: 'US', address: '', image: 'UrbanStays.jpg',
      flats: flats(5, 6, ['P-1', 'P-2', 'G-1', 'S-1']), createdAt: now() },
  ];

  const superAdmin = {
    id: uuid(),
    name: 'Praveen (Super Admin)',
    email: 'ks2.praveen@gmail.com',
    phone: '',
    role: 'super_admin',
    buildingId: null,
    flatNumber: null,
    passwordHash: hash('Admin@123'),
    createdAt: now(),
  };

  const users = [superAdmin];
  const tickets = [];

  buildings.forEach((b, i) => {
    const admin = {
      id: uuid(),
      name: `${b.name} Admin`,
      email: `admin.${b.code.toLowerCase()}@example.com`,
      phone: '9999900000',
      role: 'admin',
      buildingIds: [b.id],
      buildingId: b.id,
      flatNumber: null,
      passwordHash: hash('Admin@123'),
      createdAt: now(),
    };
    const resident = {
      id: uuid(),
      name: `Flat 101 (${b.code})`,
      email: '',
      phone: `900000000${i + 1}`, // residents log in with their mobile number
      role: 'user',
      buildingId: b.id,
      flatNumber: '101',
      passwordHash: hash('User@123'),
      mustChangePassword: false, // demo account; real accounts created by admins start with true
      createdAt: now(),
    };
    users.push(admin, resident);

    if (i === 0) {
      tickets.push({
        id: uuid(),
        ticketNumber: `${b.code}${Math.floor(10000 + Math.random() * 90000)}`,
        buildingId: b.id,
        buildingName: b.name,
        userId: resident.id,
        flatNumber: resident.flatNumber,
        category: 'Plumbing',
        description: 'Kitchen sink is leaking under the cabinet.',
        images: [],
        status: 'open',
        resolutionNotes: null,
        technicianPhone: null,
        technicianNotifiedAt: null,
        createdAt: now(),
        updatedAt: now(),
        closedAt: null,
      });
    }
  });

  return { users, buildings, tickets, waitlist: [] };
}

module.exports = { buildSeedData };

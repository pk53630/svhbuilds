const db = require('../db');

/**
 * Generates a service request / ticket number like "LH12345" or "SVL48213":
 * the building's short code followed by a random 5-digit number, guaranteed
 * unique among existing tickets.
 */
function generateTicketNumber(buildingCode) {
  const { tickets } = db.read();
  const existing = new Set(tickets.map((t) => t.ticketNumber));

  let ticketNumber;
  do {
    const digits = Math.floor(10000 + Math.random() * 90000); // 10000-99999
    ticketNumber = `${buildingCode}${digits}`;
  } while (existing.has(ticketNumber));

  return ticketNumber;
}

module.exports = { generateTicketNumber };

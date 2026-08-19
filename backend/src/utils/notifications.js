/**
 * Notification stubs.
 *
 * For this prototype, "sending" a WhatsApp message or email just logs the
 * message and appends it to data/notifications.log, so you can see exactly
 * what would have been sent and to whom. Wire in real providers when you're
 * ready to go live — see docs/DEPLOYMENT_AND_APPSTORE_GUIDE.md for the
 * exact steps (Gmail App Password + Nodemailer, WhatsApp Business Cloud API).
 */
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'data', 'notifications.log');

function logNotification(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log('[notify]', entry);
}

function ticketMessage(ticket, building) {
  return (
    `New maintenance request ${ticket.ticketNumber}\n` +
    `Building: ${building.name} | Flat: ${ticket.flatNumber}\n` +
    `Category: ${ticket.category}\n` +
    `Description: ${ticket.description || '(none)'}\n` +
    (ticket.images && ticket.images.length ? `Photos attached: ${ticket.images.length}\n` : '') +
    `Status: ${ticket.status}`
  );
}

async function sendWhatsApp(toPhone, ticket, building) {
  // TODO: replace with a real call to the WhatsApp Business Cloud API using
  // process.env.WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN.
  const message = ticketMessage(ticket, building);
  logNotification(`WHATSAPP -> ${toPhone || '(no phone on file)'}: ${message.replace(/\n/g, ' | ')}`);
}

async function sendEmail(toEmail, subject, ticket, building) {
  // TODO: replace with real Nodemailer/Gmail sending using
  // process.env.GMAIL_USER / GMAIL_APP_PASSWORD.
  const message = ticketMessage(ticket, building);
  logNotification(`EMAIL -> ${toEmail || '(no email on file)'} | Subject: ${subject}: ${message.replace(/\n/g, ' | ')}`);
}

/** Notifies the resident, the building's admin(s), and the super admin about a ticket event. */
async function notifyTicketEvent({ ticket, building, resident, admins, superAdmins, subject }) {
  const recipients = [resident, ...admins, ...superAdmins].filter(Boolean);
  await Promise.all(
    recipients.map(async (user) => {
      await sendWhatsApp(user.phone, ticket, building);
      await sendEmail(user.email, subject, ticket, building);
    })
  );
}

/**
 * Builds a WhatsApp "click to chat" link (wa.me) pre-filled with the ticket
 * details, addressed to the technician for that ticket's category. Opening
 * this link (the frontend does this in a new tab) opens WhatsApp Web/Desktop/
 * the WhatsApp app with the message ready to send — no WhatsApp Business API
 * credentials required. Also logs the trigger for an audit trail; swap for a
 * direct WhatsApp Business Cloud API call later if you want it to send
 * without a human pressing "Send".
 */
function buildTechnicianWhatsAppLink(phone, ticket, building) {
  const message =
    `New maintenance job assigned\n` +
    `Ticket: ${ticket.ticketNumber}\n` +
    `Building: ${building.name} | Flat: ${ticket.flatNumber}\n` +
    `Issue: ${ticket.category}\n` +
    `Details: ${ticket.description || '(none)'}`;

  logNotification(`WHATSAPP (technician) -> ${phone}: ${message.replace(/\n/g, ' | ')}`);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

module.exports = { sendWhatsApp, sendEmail, notifyTicketEvent, buildTechnicianWhatsAppLink, logNotification };

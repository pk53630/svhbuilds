/**
 * Maps each issue category to the technician who should be notified by
 * WhatsApp when a building admin triggers it from a ticket.
 *
 * Update these numbers any time — no code changes needed elsewhere.
 * Format: country code + number, no "+", no spaces (matches WhatsApp's
 * wa.me link format), e.g. "918553227280".
 */
const TECHNICIANS_BY_CATEGORY = {
  Plumbing: '918553227280',
  Carpentry: '919035517844',
  Electricity: '918105870377',
  'Water Issue': '918105870377',
  'Internet Not Working': '918105870377',
  'Lift Not Working': '918105870377',
  'Backup Power Issue': '918105870377',
  Cleaning: '918105870377',
  'Access Not Working': '918105870377',
  'Washing Machine': '918105870377',
  Others: '918105870377',
};

function technicianPhoneFor(category) {
  return TECHNICIANS_BY_CATEGORY[category] || TECHNICIANS_BY_CATEGORY.Others;
}

module.exports = { TECHNICIANS_BY_CATEGORY, technicianPhoneFor };

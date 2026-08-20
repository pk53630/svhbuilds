/** Shared helpers for the small charts/reports (LPG, diesel, rent). */

/** Last `count` calendar years ending with the current year, ascending, e.g. [2024,2025,2026]. */
function lastYears(count) {
  const current = new Date().getFullYear();
  const years = [];
  for (let i = count - 1; i >= 0; i--) years.push(current - i);
  return years;
}

/** Counts how many records fall in each of the last `count` years, by their `date` field. */
function countByYear(records, count = 3) {
  const years = lastYears(count);
  const counts = Object.fromEntries(years.map((y) => [y, 0]));
  records.forEach((r) => {
    const year = new Date(r.date).getFullYear();
    if (counts[year] !== undefined) counts[year] += 1;
  });
  return years.map((year) => ({ label: String(year), value: counts[year] }));
}

/** "YYYY-MM" key for the last `count` months, ascending, ending with the current month. */
function lastMonthKeys(count) {
  const now = new Date();
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

module.exports = { lastYears, countByYear, lastMonthKeys, monthLabel };

const KOLKATA = 'Asia/Kolkata';

/** Calendar year in India, used for human-readable inquiry references. */
export function indiaYear(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: KOLKATA, year: 'numeric' }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'year')?.value);
}

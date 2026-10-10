import type { Language } from './enums.js';

/** All monetary values are integer paise. 1 INR = 100 paise. */
export function assertPaise(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid paise amount: ${value}`);
  }
  return value;
}

/** Formats integer paise as locale-aware INR, e.g. ₹1,23,456 (en-IN) or ₹1,23,456 (hi-IN). */
export function formatInr(paise: number, language: Language = 'en'): string {
  assertPaise(paise);
  return new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** Rupee amount as a plain decimal string for CSV/admin inputs, e.g. 1234500 -> "12345.00". */
export function paiseToRupeeString(paise: number): string {
  assertPaise(paise);
  const rupees = Math.floor(paise / 100);
  const remainder = String(paise % 100).padStart(2, '0');
  return `${rupees}.${remainder}`;
}

/** Parses a rupee string such as "12345" or "12345.5" into integer paise. Returns null if invalid. */
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

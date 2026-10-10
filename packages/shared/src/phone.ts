const COUNTRY_CODE = /^\+[1-9]\d{0,2}$/;

/**
 * Normalizes a country code + mobile number into E.164-style "+<cc><digits>".
 * India (+91) requires a 10-digit mobile starting with 6-9. Other countries accept 6-12 digits.
 * Returns null when the input is not a plausible mobile number.
 */
export function normalizePhone(countryCode: string, mobile: string): string | null {
  const cc = countryCode.replace(/\s+/g, '');
  if (!COUNTRY_CODE.test(cc)) return null;
  const digits = mobile.replace(/[\s()-]+/g, '');
  if (cc === '+91') {
    return /^[6-9]\d{9}$/.test(digits) ? `${cc}${digits}` : null;
  }
  return /^\d{6,12}$/.test(digits) ? `${cc}${digits}` : null;
}

/** Masks a phone for logs / admin lists, e.g. +919876543210 -> +91******3210. */
export function maskPhone(e164: string): string {
  if (e164.length <= 6) return '******';
  return `${e164.slice(0, 3)}${'*'.repeat(e164.length - 7)}${e164.slice(-4)}`;
}

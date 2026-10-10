import type { InquiryStatus } from '@pcs/shared';
import { ApiError } from '../api/http.js';
import type { Tone } from './ui.js';

/** Badge tone per inquiry status. Text always accompanies the colour. */
export const INQUIRY_TONE: Record<InquiryStatus, Tone> = {
  new: 'info',
  contacted: 'warn',
  quotation_sent: 'info',
  confirmed: 'good',
  closed: 'neutral',
  spam: 'bad',
};

/** Every error code the admin API can return. Anything else falls back to the generic message. */
const KNOWN = [
  'NETWORK',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'CSRF_INVALID',
  'FORBIDDEN',
  'DUPLICATE',
  'SLUG_TAKEN',
  'SKU_TAKEN',
  'PRODUCT_ARCHIVED',
  'PRODUCT_REFERENCED',
  'NOT_FOUND',
  'INVALID_ID',
  'MALFORMED_JSON',
  'PAYLOAD_TOO_LARGE',
  'NOT_ENABLED',
  'UPLOAD_FAILED',
  'CAMPAIGN_NOT_DRAFT',
  'CAMPAIGN_NOT_PREPARED',
  'CUSTOMER_NOT_ELIGIBLE',
  'INTERNAL',
] as const;

/** Translation key for an API error. Unknown codes fall back to a generic admin message. */
export function adminErrorKey(err: unknown): string {
  if (err instanceof ApiError && (KNOWN as readonly string[]).includes(err.code)) {
    return `admin.errors.${err.code}`;
  }
  return 'admin.errors.generic';
}

/** Dates are shown in India time, whatever the viewer's timezone. */
export function formatAdminDate(iso: string, language: 'en' | 'hi'): string {
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

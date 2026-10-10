import { makeLimiter } from '../middleware/rateLimit.js';

export const INQUIRY_LIMIT_PER_HOUR = 8;

/**
 * Quote-form limit per IP per hour. Production always uses the default. In other environments,
 * DEV_INQUIRY_LIMIT_PER_HOUR can raise it for local end-to-end runs.
 */
export function inquiryLimitPerHour(env: { isProduction: boolean; DEV_INQUIRY_LIMIT_PER_HOUR?: number }): number {
  if (env.isProduction || env.DEV_INQUIRY_LIMIT_PER_HOUR === undefined) return INQUIRY_LIMIT_PER_HOUR;
  return env.DEV_INQUIRY_LIMIT_PER_HOUR;
}

/** Public quote form: a small number of submissions per IP per hour. */
export function makeInquiryLimiter(enabled: boolean, limit: number = INQUIRY_LIMIT_PER_HOUR) {
  return makeLimiter({
    windowMs: 60 * 60 * 1000,
    limit,
    code: 'RATE_LIMITED',
    message: 'Too many quote requests from this network. Please try again later or contact us on WhatsApp.',
    enabled,
  });
}

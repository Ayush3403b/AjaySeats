import { describe, it, expect } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { INQUIRY_LIMIT_PER_HOUR, inquiryLimitPerHour } from '../src/routes/limits.js';

const base = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  SESSION_SECRET: 'x'.repeat(40),
};

describe('quote-form limit', () => {
  it('uses the default when no override is set', () => {
    expect(inquiryLimitPerHour(loadEnv({ ...base, NODE_ENV: 'development' }))).toBe(INQUIRY_LIMIT_PER_HOUR);
  });

  it('lets development raise the limit for local end-to-end runs', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'development', DEV_INQUIRY_LIMIT_PER_HOUR: '200' });
    expect(inquiryLimitPerHour(env)).toBe(200);
  });

  it('ignores the override in production', () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: 'production',
      CLIENT_URL: 'https://site.example',
      DEV_INQUIRY_LIMIT_PER_HOUR: '200',
    });
    expect(inquiryLimitPerHour(env)).toBe(INQUIRY_LIMIT_PER_HOUR);
  });

  it('rejects nonsense values', () => {
    expect(() => loadEnv({ ...base, DEV_INQUIRY_LIMIT_PER_HOUR: '0' })).toThrow(/DEV_INQUIRY_LIMIT_PER_HOUR/);
  });
});

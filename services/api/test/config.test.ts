import { describe, it, expect } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const base = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  SESSION_SECRET: 'x'.repeat(40),
};

describe('environment validation fails loudly', () => {
  it('rejects a short session secret', () => {
    expect(() => loadEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects a non-mongo connection string', () => {
    expect(() => loadEnv({ ...base, MONGODB_URI: 'postgres://nope' })).toThrow(/MONGODB_URI/);
  });

  it('requires https origins in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', CLIENT_URL: 'http://site.example' })).toThrow(/https/);
  });

  it('rejects CLIENT_URL entries that include a path', () => {
    expect(() => loadEnv({ ...base, CLIENT_URL: 'http://localhost:5173/app' })).toThrow(/origin only/);
  });

  it('accepts a valid development config with multiple origins', () => {
    const env = loadEnv({ ...base, CLIENT_URL: 'http://localhost:5173, https://example.vercel.app' });
    expect(env.clientOrigins).toEqual(['http://localhost:5173', 'https://example.vercel.app']);
    expect(env.isProduction).toBe(false);
  });
});

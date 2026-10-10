import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { startTestDb, stopTestDb, seedFixtures, testEnv, OWNER_EMAIL, OWNER_PASSWORD } from './helpers.js';

const API = '/api/v1';

describe('auth and admin access control', () => {
  let mongod: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    mongod = await startTestDb();
    app = createApp(testEnv(mongod.getUri()), { enableRateLimits: false });
  });
  afterAll(async () => stopTestDb(mongod));
  beforeEach(async () => {
    await seedFixtures();
  });

  it('rejects admin routes without a session with a standard error envelope', async () => {
    const res = await request(app).get(`${API}/admin/products`).expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('signs in with an HttpOnly, SameSite cookie and returns a CSRF token without leaking the hash', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: OWNER_EMAIL, password: OWNER_PASSWORD })
      .expect(200);
    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    const sid = cookies.find((c) => c.startsWith('sid='));
    expect(sid).toBeDefined();
    expect(sid).toMatch(/HttpOnly/i);
    expect(sid).toMatch(/SameSite=Lax/i);
    expect(res.body.csrfToken.length).toBeGreaterThanOrEqual(32);
    expect(res.body.user.role).toBe('owner');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
  });

  it('returns the same generic error for a wrong password and an unknown email', async () => {
    const wrong = await request(app).post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: 'not-the-password-123' }).expect(401);
    const unknown = await request(app).post(`${API}/auth/login`).send({ email: 'nobody@test.local', password: 'not-the-password-123' }).expect(401);
    expect({ code: wrong.body.error.code, message: wrong.body.error.message }).toEqual({
      code: unknown.body.error.code,
      message: unknown.body.error.message,
    });
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('requires the CSRF header on admin writes, but allows reads with a session', async () => {
    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    await agent.get(`${API}/admin/products`).expect(200);
    const body = { slug: 'csrf-test', sku: 'CSRF-001' };
    const noToken = await agent.patch(`${API}/admin/products/000000000000000000000000`).send(body);
    expect(noToken.status).toBe(403);
    expect(noToken.body.error.code).toBe('CSRF_INVALID');
    const wrongToken = await agent
      .patch(`${API}/admin/products/000000000000000000000000`)
      .set('X-CSRF-Token', 'definitely-wrong-token-value-xxxxxxxx')
      .send(body);
    expect(wrongToken.status).toBe(403);
    expect(login.body.csrfToken).toBeTruthy();
  });

  it('logout revokes the session server-side', async () => {
    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    await agent.post(`${API}/auth/logout`).set('X-CSRF-Token', login.body.csrfToken).expect(204);
    await agent.get(`${API}/auth/me`).expect(401);
  });

  it('change-password requires the current password and revokes existing sessions', async () => {
    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    const token = login.body.csrfToken;
    const wrong = await agent
      .post(`${API}/auth/change-password`)
      .set('X-CSRF-Token', token)
      .send({ currentPassword: 'wrong-password-value', newPassword: 'brand-new-password-123' });
    expect(wrong.status).toBe(422);
    await agent
      .post(`${API}/auth/change-password`)
      .set('X-CSRF-Token', token)
      .send({ currentPassword: OWNER_PASSWORD, newPassword: 'brand-new-password-123' })
      .expect(204);
    await agent.get(`${API}/auth/me`).expect(401);
    await request(app).post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: 'brand-new-password-123' }).expect(200);
  });

  it('throttles repeated sign-in attempts when rate limits are enabled', async () => {
    const limited = createApp(testEnv(mongod.getUri()), { enableRateLimits: true });
    let status = 0;
    for (let i = 0; i < 12; i += 1) {
      const res = await request(limited).post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: 'wrong-password-value' });
      status = res.status;
    }
    expect(status).toBe(429);
  });
});

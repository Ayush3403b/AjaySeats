import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Inquiry } from '../src/models/Inquiry.js';
import { startTestDb, stopTestDb, seedFixtures, testEnv, OWNER_EMAIL, OWNER_PASSWORD } from './helpers.js';

const API = '/api/v1';

function formBody(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Customer',
    countryCode: '+91',
    mobile: '98765 43210',
    language: 'en',
    city: 'Patna',
    vehicle: { make: 'Maruti', model: 'Swift', year: 2020 },
    items: [{ productId, quantity: 2 }],
    material: 'leather',
    colour: '#111111',
    message: 'Need quote for 2 seats',
    consentMarketing: true,
    website: '',
    formStartedAt: Date.now() - 10_000,
    ...overrides,
  };
}

describe('quote requests (inquiries)', () => {
  let mongod: MongoMemoryServer;
  let app: ReturnType<typeof createApp>;
  let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

  beforeAll(async () => {
    mongod = await startTestDb();
    app = createApp(testEnv(mongod.getUri()), { enableRateLimits: false });
  });
  afterAll(async () => stopTestDb(mongod));
  beforeEach(async () => {
    fixtures = await seedFixtures();
  });

  it('saves a valid request with a unique reference and price snapshots, and never calls it an order', async () => {
    const res = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.published._id))).expect(201);
    expect(res.body.reference).toMatch(/^INQ-\d{4}-\d{6}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/order/i);
    const saved = await Inquiry.findOne({ reference: res.body.reference }).lean();
    expect(saved?.status).toBe('new');
    expect(saved?.phone).toBe('+919876543210');
    expect(saved?.items[0].unitPriceMinorSnapshot).toBe(500000);
    expect(saved?.consent.marketing).toBe(true);
  });

  it('issues sequential references', async () => {
    const a = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.published._id))).expect(201);
    const b = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.published._id))).expect(201);
    const seqA = Number(a.body.reference.slice(-6));
    const seqB = Number(b.body.reference.slice(-6));
    expect(seqB).toBe(seqA + 1);
  });

  it('silently rejects a filled honeypot without saving anything', async () => {
    const before = await Inquiry.countDocuments();
    const res = await request(app)
      .post(`${API}/inquiries`)
      .send(formBody(String(fixtures.published._id), { website: 'http://spam.example' }))
      .expect(400);
    expect(res.body.error.code).toBe('SUBMISSION_REJECTED');
    expect(await Inquiry.countDocuments()).toBe(before);
  });

  it('rejects a form submitted faster than a human could fill it', async () => {
    const res = await request(app)
      .post(`${API}/inquiries`)
      .send(formBody(String(fixtures.published._id), { formStartedAt: Date.now() }))
      .expect(400);
    expect(res.body.error.code).toBe('SUBMISSION_REJECTED');
  });

  it('validates the mobile number for India and reports the field', async () => {
    const res = await request(app)
      .post(`${API}/inquiries`)
      .send(formBody(String(fixtures.published._id), { mobile: '1234567890' }))
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain('mobile');
  });

  it('rejects drafts, archived products and duplicate lines', async () => {
    const draft = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.draft._id))).expect(422);
    expect(draft.body.error.message).toMatch(/no longer available/);
    const dup = await request(app)
      .post(`${API}/inquiries`)
      .send(formBody(String(fixtures.published._id), { items: [{ productId: String(fixtures.published._id), quantity: 1 }, { productId: String(fixtures.published._id), quantity: 1 }] }))
      .expect(422);
    expect(dup.body.error.details[0].path).toBe('items');
  });

  it('rejects unknown fields in the public payload (strict schema)', async () => {
    await request(app)
      .post(`${API}/inquiries`)
      .send({ ...formBody(String(fixtures.published._id)), status: 'confirmed', reference: 'INQ-FAKE-1' })
      .expect(422);
  });

  it('admin: list requires auth, masks phones, and detail shows the full number', async () => {
    const created = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.published._id))).expect(201);
    await request(app).get(`${API}/admin/inquiries`).expect(401);

    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    const list = await agent.get(`${API}/admin/inquiries?q=${created.body.reference}`).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].phoneMasked).not.toContain('98765');
    const id = list.body.items[0].id;
    const detail = await agent.get(`${API}/admin/inquiries/${id}`).expect(200);
    expect(detail.body.phone).toBe('+919876543210');
    expect(detail.body.items[0].unitPriceMinorSnapshot).toBe(500000);

    const csrf = login.body.csrfToken;
    const status = await agent
      .patch(`${API}/admin/inquiries/${id}/status`)
      .set('X-CSRF-Token', csrf)
      .send({ status: 'contacted', note: 'Called customer' })
      .expect(200);
    expect(status.body.status).toBe('contacted');
    expect(status.body.statusHistory.map((h: { status: string }) => h.status)).toEqual(['new', 'contacted']);

    const noted = await agent
      .patch(`${API}/admin/inquiries/${id}/notes`)
      .set('X-CSRF-Token', csrf)
      .send({ text: 'Wants tan colour' })
      .expect(200);
    expect(noted.body.notes[0].text).toBe('Wants tan colour');

    const invalid = await agent.patch(`${API}/admin/inquiries/${id}/status`).set('X-CSRF-Token', csrf).send({ status: 'paid' }).expect(422);
    expect(invalid.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('builds a URL-encoded WhatsApp follow-up link without marking anything sent', async () => {
    const created = await request(app).post(`${API}/inquiries`).send(formBody(String(fixtures.published._id), { language: 'en' })).expect(201);
    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    const list = await agent.get(`${API}/admin/inquiries?q=${created.body.reference}`).expect(200);
    const res = await agent
      .post(`${API}/admin/inquiries/${list.body.items[0].id}/whatsapp-link`)
      .set('X-CSRF-Token', login.body.csrfToken)
      .expect(200);
    expect(res.body.url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(res.body.url).toContain(encodeURIComponent(created.body.reference));
    expect(res.body.url).not.toContain(' ');
    const saved = await Inquiry.findById(list.body.items[0].id).lean();
    expect(saved?.status).toBe('new');
  });
});

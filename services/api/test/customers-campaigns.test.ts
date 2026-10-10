import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Customer } from '../src/models/Customer.js';
import { Campaign } from '../src/models/Campaign.js';
import { CampaignRecipient } from '../src/models/CampaignRecipient.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/auth.js';
import {
  startTestDb,
  stopTestDb,
  seedFixtures,
  testEnv,
  productFixture,
  OWNER_EMAIL,
  OWNER_PASSWORD,
} from './helpers.js';
import { syncCustomersFromInquiries } from '../src/services/customers.js';

const API = '/api/v1';
const STAFF_EMAIL = 'staff@test.local';
const STAFF_PASSWORD = 'staff-password-long-enough';
const CLOUD = { CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: '123456', CLOUDINARY_API_SECRET: 'shh-secret' };

function formBody(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Asha Kumari',
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

async function login(app: ReturnType<typeof createApp>, email: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post(`${API}/auth/login`).send({ email, password }).expect(200);
  return { agent, csrf: res.body.csrfToken as string };
}

describe('customers and campaigns', () => {
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
    await User.create({
      name: 'Staff',
      email: STAFF_EMAIL,
      passwordHash: await hashPassword(STAFF_PASSWORD),
      role: 'staff',
      active: true,
    });
  });

  async function submit(overrides: Record<string, unknown>) {
    return request(app)
      .post(`${API}/inquiries`)
      .send(formBody(String(fixtures.published._id), overrides))
      .expect(201);
  }

  it('creates customers from quote requests, keyed by phone, with the latest consent answer', async () => {
    await submit({ mobile: '98765 43210', name: 'Asha', consentMarketing: false });
    await submit({ mobile: '98765 43210', name: 'Asha K', consentMarketing: true });
    await submit({ mobile: '91234 56789', name: 'Ravi', consentMarketing: false });

    const asha = await Customer.findOne({ phone: '+919876543210' }).lean();
    expect(asha?.inquiryCount).toBe(2);
    expect(asha?.consent.marketing).toBe(true);
    expect(asha?.name).toBe('Asha K');
    const ravi = await Customer.findOne({ phone: '+919123456789' }).lean();
    expect(ravi?.consent.marketing).toBe(false);
    expect(await Customer.countDocuments()).toBe(2);
  });

  it('a later quote request never clears a staff opt-out', async () => {
    await submit({ mobile: '98765 43210' });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const id = String((await Customer.findOne({ phone: '+919876543210' }).lean())?._id);
    await owner.agent
      .patch(`${API}/admin/customers/${id}/opt-out`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ optedOut: true, note: 'asked to stop' })
      .expect(200);

    await submit({ mobile: '98765 43210', consentMarketing: true });
    const after = await Customer.findById(id).lean();
    expect(after?.optedOutAt).not.toBeNull();
    expect(after?.consent.marketing).toBe(true);
  });

  it('sync rebuilds customers from inquiries and is idempotent', async () => {
    await submit({ mobile: '98765 43210', consentMarketing: false });
    await submit({ mobile: '98765 43210', consentMarketing: true });
    await Customer.deleteMany({});
    await syncCustomersFromInquiries();
    await syncCustomersFromInquiries();
    const asha = await Customer.findOne({ phone: '+919876543210' }).lean();
    expect(asha?.inquiryCount).toBe(2);
    expect(asha?.consent.marketing).toBe(true);
    expect(await Customer.countDocuments()).toBe(1);
  });

  it('prepares a campaign with eligible recipients only and reports exclusions by reason', async () => {
    await submit({ mobile: '98765 43210', name: 'Asha', consentMarketing: true });
    await submit({ mobile: '91234 56789', name: 'Ravi', consentMarketing: false });
    await submit({ mobile: '90000 11111', name: 'Meena', consentMarketing: true });
    const meena = await Customer.findOne({ phone: '+919000011111' });
    meena!.optedOutAt = new Date();
    await meena!.save();

    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const created = await owner.agent
      .post(`${API}/admin/campaigns`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Monsoon offer', language: 'en', message: 'Hi {name}, our monsoon offer is live.' })
      .expect(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.counts).toEqual({ eligible: 0, excludedNoConsent: 0, excludedOptedOut: 0 });

    const prepared = await owner.agent
      .post(`${API}/admin/campaigns/${created.body.id}/prepare`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(200);
    expect(prepared.body.status).toBe('prepared');
    expect(prepared.body.counts).toEqual({ eligible: 1, excludedNoConsent: 1, excludedOptedOut: 1 });

    const recipients = await owner.agent.get(`${API}/admin/campaigns/${created.body.id}/recipients`).expect(200);
    expect(recipients.body.items).toHaveLength(1);
    expect(recipients.body.items[0].customerName).toBe('Asha');
    expect(recipients.body.items[0].phoneMasked).not.toContain('98765');
    expect(JSON.stringify(recipients.body)).not.toContain('Ravi');
    expect(JSON.stringify(recipients.body)).not.toContain('Meena');
  });

  it('preparing twice is rejected and a prepared campaign cannot be edited', async () => {
    await submit({ mobile: '98765 43210' });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const c = await owner.agent
      .post(`${API}/admin/campaigns`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Test run', language: 'en', message: 'Hello {name}, a short test message.' })
      .expect(201);
    await owner.agent.post(`${API}/admin/campaigns/${c.body.id}/prepare`).set('X-CSRF-Token', owner.csrf).expect(200);
    const again = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/prepare`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(409);
    expect(again.body.error.code).toBe('CAMPAIGN_NOT_DRAFT');
    await owner.agent
      .patch(`${API}/admin/campaigns/${c.body.id}`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Renamed campaign' })
      .expect(409);
  });

  it('builds a personalised link, then records link-opened and sent-confirmed as separate timestamps', async () => {
    await submit({ mobile: '98765 43210', name: 'Asha' });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const c = await owner.agent
      .post(`${API}/admin/campaigns`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Track me', language: 'en', message: 'Hello {name}, offer inside.' })
      .expect(201);
    await owner.agent.post(`${API}/admin/campaigns/${c.body.id}/prepare`).set('X-CSRF-Token', owner.csrf).expect(200);
    const list = await owner.agent.get(`${API}/admin/campaigns/${c.body.id}/recipients`).expect(200);
    const rid = list.body.items[0].id;

    const link = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/link`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(200);
    expect(link.body.url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(decodeURIComponent(link.body.url)).toContain('Hello Asha, offer inside.');

    const opened = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/link-opened`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(200);
    expect(opened.body.linkOpenedAt).not.toBeNull();
    expect(opened.body.sentConfirmedAt).toBeNull();
    const firstOpen = opened.body.linkOpenedAt;
    const reopened = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/link-opened`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(200);
    expect(reopened.body.linkOpenedAt).toBe(firstOpen);

    const sent = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/sent-confirmed`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(200);
    expect(sent.body.sentConfirmedAt).not.toBeNull();
    expect(sent.body.linkOpenedAt).toBe(firstOpen);

    const detail = await owner.agent.get(`${API}/admin/campaigns/${c.body.id}`).expect(200);
    expect(detail.body.linkOpenedCount).toBe(1);
    expect(detail.body.sentConfirmedCount).toBe(1);
  });

  it('re-checks eligibility at link time: an opt-out after preparation blocks the link with 409', async () => {
    await submit({ mobile: '98765 43210', name: 'Asha' });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const c = await owner.agent
      .post(`${API}/admin/campaigns`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ name: 'Late opt out', language: 'en', message: 'Hello {name}, offer inside.' })
      .expect(201);
    await owner.agent.post(`${API}/admin/campaigns/${c.body.id}/prepare`).set('X-CSRF-Token', owner.csrf).expect(200);
    const list = await owner.agent.get(`${API}/admin/campaigns/${c.body.id}/recipients`).expect(200);
    const rid = list.body.items[0].id;
    const customerId = String((await Customer.findOne({ phone: '+919876543210' }).lean())?._id);

    await owner.agent
      .patch(`${API}/admin/customers/${customerId}/opt-out`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ optedOut: true })
      .expect(200);

    const blocked = await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/link`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(409);
    expect(blocked.body.error.code).toBe('CUSTOMER_NOT_ELIGIBLE');
    await owner.agent
      .post(`${API}/admin/campaigns/${c.body.id}/recipients/${rid}/sent-confirmed`)
      .set('X-CSRF-Token', owner.csrf)
      .expect(409);

    const listed = await owner.agent.get(`${API}/admin/campaigns/${c.body.id}/recipients`).expect(200);
    expect(listed.body.items[0].eligible).toBe(false);
  });

  it('only owners may clear an opt-out; staff may set one', async () => {
    await submit({ mobile: '98765 43210' });
    const customerId = String((await Customer.findOne({ phone: '+919876543210' }).lean())?._id);
    const staff = await login(app, STAFF_EMAIL, STAFF_PASSWORD);
    await staff.agent
      .patch(`${API}/admin/customers/${customerId}/opt-out`)
      .set('X-CSRF-Token', staff.csrf)
      .send({ optedOut: true })
      .expect(200);
    const denied = await staff.agent
      .patch(`${API}/admin/customers/${customerId}/opt-out`)
      .set('X-CSRF-Token', staff.csrf)
      .send({ optedOut: false })
      .expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const restored = await owner.agent
      .patch(`${API}/admin/customers/${customerId}/opt-out`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ optedOut: false })
      .expect(200);
    expect(restored.body.optedOut).toBe(false);
  });

  it('keeps customer and campaign routes behind the session and CSRF checks', async () => {
    await request(app).get(`${API}/admin/customers`).expect(401);
    await request(app).get(`${API}/admin/campaigns`).expect(401);
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    await owner.agent
      .post(`${API}/admin/campaigns`)
      .send({ name: 'No token', language: 'en', message: 'Hello {name}, offer inside.' })
      .expect(403);
    const listed = await owner.agent.get(`${API}/admin/campaigns`).expect(200);
    expect(listed.body.items).toEqual([]);
    expect(await CampaignRecipient.countDocuments()).toBe(0);
    expect(await Campaign.countDocuments()).toBe(0);
  });
});

describe('image uploads and product images', () => {
  let mongod: MongoMemoryServer;
  let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

  beforeAll(async () => {
    mongod = await startTestDb();
  });
  afterAll(async () => stopTestDb(mongod));
  beforeEach(async () => {
    fixtures = await seedFixtures();
  });

  it('answers 501 NOT_ENABLED when Cloudinary is not configured, and never a fake signature', async () => {
    const app = createApp(testEnv(mongod.getUri()), { enableRateLimits: false });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const res = await owner.agent.post(`${API}/admin/uploads/signature`).set('X-CSRF-Token', owner.csrf).expect(501);
    expect(res.body.error.code).toBe('NOT_ENABLED');
    expect(res.body.signature).toBeUndefined();
  });

  it('signs upload parameters in Cloudinary order with the API secret, which is not returned', async () => {
    const app = createApp(testEnv(mongod.getUri(), CLOUD), { enableRateLimits: false });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const res = await owner.agent.post(`${API}/admin/uploads/signature`).set('X-CSRF-Token', owner.csrf).expect(200);
    const { timestamp, signature, folder, cloudName, apiKey } = res.body;
    expect(folder).toBe('premium-seat-covers/products');
    expect(cloudName).toBe('demo-cloud');
    expect(apiKey).toBe('123456');
    const expected = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}shh-secret`)
      .digest('hex');
    expect(signature).toBe(expected);
    expect(JSON.stringify(res.body)).not.toContain('shh-secret');
  });

  it('accepts product images from this account and rejects images from anywhere else', async () => {
    const app = createApp(testEnv(mongod.getUri(), CLOUD), { enableRateLimits: false });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const image = (url: string) => ({ url, publicId: 'premium-seat-covers/products/abc', alt: { en: 'Front view', hi: '' }, order: 0 });
    const body = productFixture(fixtures.category._id, { slug: 'with-images', sku: 'IMG-001' });

    const rejected = await owner.agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ ...body, images: [image('https://res.cloudinary.com/someone-else/image/upload/a.jpg')] })
      .expect(422);
    expect(rejected.body.error.code).toBe('VALIDATION_FAILED');

    const schemaRejected = await owner.agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ ...body, images: [image('https://example.com/a.jpg')] })
      .expect(422);
    expect(schemaRejected.body.error.code).toBe('VALIDATION_FAILED');

    const ok = await owner.agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', owner.csrf)
      .send({ ...body, images: [image('https://res.cloudinary.com/demo-cloud/image/upload/v1/a.jpg')] })
      .expect(201);
    expect(ok.body.images).toHaveLength(1);
    expect(ok.body.images[0].url).toContain('demo-cloud');
  });

  it('refuses product images when uploads are not configured', async () => {
    const app = createApp(testEnv(mongod.getUri()), { enableRateLimits: false });
    const owner = await login(app, OWNER_EMAIL, OWNER_PASSWORD);
    const body = productFixture(fixtures.category._id, { slug: 'no-cloud', sku: 'NOC-001' });
    await owner.agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        ...body,
        images: [{ url: 'https://res.cloudinary.com/demo-cloud/image/upload/a.jpg', publicId: 'premium-seat-covers/products/x', alt: { en: 'x', hi: '' }, order: 0 }],
      })
      .expect(501);
  });
});

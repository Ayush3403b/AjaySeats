import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Inquiry } from '../src/models/Inquiry.js';
import { startTestDb, stopTestDb, seedFixtures, testEnv, productFixture, OWNER_EMAIL, OWNER_PASSWORD } from './helpers.js';

const API = '/api/v1';

describe('catalogue (public) and product management (admin)', () => {
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

  async function adminAgent() {
    const agent = request.agent(app);
    const login = await agent.post(`${API}/auth/login`).send({ email: OWNER_EMAIL, password: OWNER_PASSWORD }).expect(200);
    return { agent, csrf: login.body.csrfToken as string };
  }

  it('public list shows only published, non-archived products with integer-paise prices', async () => {
    const res = await request(app).get(`${API}/products`).expect(200);
    const slugs = res.body.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toEqual(['test-leather-full-set']);
    expect(res.body.items[0].priceMinor).toBe(500000);
    expect(res.body.items[0].currency).toBe('INR');
    expect(res.headers['cache-control']).toContain('max-age');
  });

  it('draft and archived products are not reachable by slug', async () => {
    await request(app).get(`${API}/products/test-draft`).expect(404);
    await request(app).get(`${API}/products/test-archived`).expect(404);
  });

  it('filters by material and price range on the effective (sale-aware) price', async () => {
    await request(app).get(`${API}/products?material=pvc`).expect(200).expect((r) => expect(r.body.total).toBe(0));
    const res = await request(app).get(`${API}/products?maxPrice=400000&material=leather`).expect(200);
    expect(res.body.total).toBe(0);
    const ok = await request(app).get(`${API}/products?minPrice=400000&maxPrice=600000`).expect(200);
    expect(ok.body.total).toBe(1);
  });

  it('rejects invalid query parameters with a validation envelope', async () => {
    const res = await request(app).get(`${API}/products?pageSize=500`).expect(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details[0].path).toBe('pageSize');
  });

  it('creates a product, rejects a sale price at or above the regular price, and rejects unknown fields', async () => {
    const { agent, csrf } = await adminAgent();
    const body = productFixture(fixtures.category._id, { slug: 'new-product', sku: 'NEW-001', priceMinor: 100000 });

    const created = await agent.post(`${API}/admin/products`).set('X-CSRF-Token', csrf).send(body).expect(201);
    expect(created.body.sku).toBe('NEW-001');

    const badSale = await agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', csrf)
      .send(productFixture(fixtures.category._id, { slug: 'bad-sale', sku: 'BAD-001', priceMinor: 100000, salePriceMinor: 100000 }))
      .expect(422);
    expect(badSale.body.error.details[0].path).toBe('salePriceMinor');

    // Mass-assignment: fields outside the whitelist are rejected, not silently stored.
    const massAssign = await agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', csrf)
      .send({ ...body, slug: 'mass-assign', sku: 'MASS-001', effectivePriceMinor: 1, archived: true })
      .expect(422);
    expect(JSON.stringify(massAssign.body.error.details)).toMatch(/unrecognized|effectivePriceMinor|archived/i);
  });

  it('rejects duplicate SKUs and slugs with explicit conflict codes', async () => {
    const { agent, csrf } = await adminAgent();
    const dupSku = await agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', csrf)
      .send(productFixture(fixtures.category._id, { slug: 'unique-slug', sku: 'TST-LTH-001' }))
      .expect(409);
    expect(dupSku.body.error.code).toBe('SKU_TAKEN');
    const dupSlug = await agent
      .post(`${API}/admin/products`)
      .set('X-CSRF-Token', csrf)
      .send(productFixture(fixtures.category._id, { slug: 'test-leather-full-set', sku: 'UNIQ-999' }))
      .expect(409);
    expect(dupSlug.body.error.code).toBe('SLUG_TAKEN');
  });

  it('price edits are visible on the public API immediately (no redeploy)', async () => {
    const { agent, csrf } = await adminAgent();
    const id = String(fixtures.published._id);
    await agent.patch(`${API}/admin/products/${id}`).set('X-CSRF-Token', csrf).send({ priceMinor: 654321 }).expect(200);
    const res = await request(app).get(`${API}/products/test-leather-full-set`).expect(200);
    expect(res.body.priceMinor).toBe(654321);
  });

  it('a sale price update is checked against the stored regular price', async () => {
    const { agent, csrf } = await adminAgent();
    const id = String(fixtures.published._id);
    await agent.patch(`${API}/admin/products/${id}`).set('X-CSRF-Token', csrf).send({ salePriceMinor: 500000 }).expect(422);
    await agent.patch(`${API}/admin/products/${id}`).set('X-CSRF-Token', csrf).send({ salePriceMinor: 450000 }).expect(200);
    const res = await request(app).get(`${API}/products/test-leather-full-set`).expect(200);
    expect(res.body.salePriceMinor).toBe(450000);
  });

  it('publish toggle and archive hide products from the public catalogue', async () => {
    const { agent, csrf } = await adminAgent();
    const id = String(fixtures.published._id);
    await agent.patch(`${API}/admin/products/${id}/publish`).set('X-CSRF-Token', csrf).send({ published: false }).expect(200);
    await request(app).get(`${API}/products/test-leather-full-set`).expect(404);
    await agent.patch(`${API}/admin/products/${id}/publish`).set('X-CSRF-Token', csrf).send({ published: true }).expect(200);
    await agent.patch(`${API}/admin/products/${id}/archive`).set('X-CSRF-Token', csrf).send({ archived: true }).expect(200);
    await request(app).get(`${API}/products/test-leather-full-set`).expect(404);
  });

  it('refuses to hard-delete a product referenced by an inquiry, but deletes an unreferenced one', async () => {
    const { agent, csrf } = await adminAgent();
    await Inquiry.create({
      reference: 'INQ-2026-000001',
      customerName: 'Ref Test',
      phone: '+919876543210',
      language: 'en',
      city: 'Patna',
      vehicle: { make: 'Maruti', model: 'Swift', year: 2020 },
      items: [{ product: fixtures.published._id, sku: 'TST-LTH-001', name: { en: 'x', hi: '' }, quantity: 1, unitPriceMinorSnapshot: 500000, salePriceMinorSnapshot: null }],
      statusHistory: [{ status: 'new', at: new Date() }],
      consent: { marketing: false, at: new Date(), source: 'quote_form' },
    });
    const blocked = await agent.delete(`${API}/admin/products/${fixtures.published._id}`).set('X-CSRF-Token', csrf).expect(409);
    expect(blocked.body.error.code).toBe('PRODUCT_REFERENCED');
    await agent.delete(`${API}/admin/products/${fixtures.draft._id}`).set('X-CSRF-Token', csrf).expect(204);
  });

  it('rejects malformed ids with 400 and unknown ids with 404', async () => {
    const { agent } = await adminAgent();
    await agent.get(`${API}/admin/products/not-an-id`).expect(400);
    await agent.get(`${API}/admin/products/000000000000000000000000`).expect(404);
  });

  it('admin list includes drafts and archived items', async () => {
    const { agent } = await adminAgent();
    const res = await agent.get(`${API}/admin/products?pageSize=50`).expect(200);
    expect(res.body.total).toBe(3);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

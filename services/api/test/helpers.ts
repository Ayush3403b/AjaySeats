import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { loadEnv, type Env } from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Inquiry } from '../src/models/Inquiry.js';
import { Counter } from '../src/models/Counter.js';
import { Customer } from '../src/models/Customer.js';
import { Campaign } from '../src/models/Campaign.js';
import { CampaignRecipient } from '../src/models/CampaignRecipient.js';
import { hashPassword } from '../src/services/auth.js';

export const OWNER_EMAIL = 'owner@test.local';
export const OWNER_PASSWORD = 'correct-horse-battery-staple';

export async function startTestDb(): Promise<MongoMemoryServer> {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  return mongod;
}

export async function stopTestDb(mongod: MongoMemoryServer): Promise<void> {
  await mongoose.disconnect();
  await mongod.stop();
}

export function testEnv(uri: string, overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: uri,
    SESSION_SECRET: 'test-secret-with-more-than-32-characters',
    CLIENT_URL: 'http://localhost:5173',
    WHATSAPP_NUMBER: '919999999999',
    ...overrides,
  });
}

export const productFixture = (categoryId: unknown, overrides: Record<string, unknown> = {}) => ({
  slug: 'test-leather-full-set',
  sku: 'TST-LTH-001',
  categoryId,
  material: 'leather',
  name: { en: 'Test Leather Full Set', hi: 'टेस्ट लेदर फुल सेट' },
  description: { en: 'Test description', hi: '' },
  colours: [{ name: { en: 'Black', hi: 'काला' }, code: '#111111' }],
  compatibleVehicles: [{ make: 'Testmake', model: 'Testmodel', yearFrom: 2019, yearTo: 2024 }],
  stitching: [{ en: 'Double stitch', hi: '' }],
  priceMinor: 500000,
  salePriceMinor: null,
  availability: 'in_stock',
  published: true,
  featured: false,
  seo: { title: { en: 'Test', hi: '' }, description: { en: 'Test seo', hi: '' } },
  ...overrides,
});

/** Resets all collections and creates one category, the owner, and a published + draft + archived product. */
export async function seedFixtures() {
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Session.deleteMany({}),
    Inquiry.deleteMany({}),
    Counter.deleteMany({}),
    Customer.deleteMany({}),
    Campaign.deleteMany({}),
    CampaignRecipient.deleteMany({}),
  ]);
  const category = await Category.create({
    slug: 'full-set-covers',
    name: { en: 'Full Set Covers', hi: 'फुल सेट कवर' },
    description: { en: 'Complete sets', hi: '' },
    sortOrder: 1,
    active: true,
  });
  await User.create({
    name: 'Owner',
    email: OWNER_EMAIL,
    passwordHash: await hashPassword(OWNER_PASSWORD),
    role: 'owner',
    active: true,
  });
  const published = await Product.create(productFixture(category._id));
  const draft = await Product.create(
    productFixture(category._id, { slug: 'test-draft', sku: 'TST-DRF-002', published: false, priceMinor: 300000 }),
  );
  const archived = await Product.create(
    productFixture(category._id, { slug: 'test-archived', sku: 'TST-ARC-003', archived: true, published: false, priceMinor: 200000 }),
  );
  return { category, published, draft, archived };
}

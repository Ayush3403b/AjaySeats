/**
 * Seeds DEMO categories and DEMO products, and provisions the owner account.
 * Run: npm run seed -w @pcs/api   (needs MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD in .env)
 *
 * Everything seeded here is clearly labelled demo data (SKU prefix DEMO-, "(Demo)" names).
 * Replace it in the admin dashboard before going live. Idempotent: re-running upserts by slug/SKU
 * and never overwrites an existing admin password.
 */
import mongoose from 'mongoose';
import { loadEnv } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../db/connect.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/auth.js';

const DEMO_CATEGORIES = [
  { slug: 'full-set-covers', sortOrder: 1, name: { en: 'Full Set Covers (Demo)', hi: 'फुल सेट कवर (डेमो)' }, description: { en: 'Demo category: complete seat sets for the whole cabin.', hi: 'डेमो श्रेणी: पूरी कैबिन के लिए पूर्ण सीट सेट।' } },
  { slug: 'front-seat-covers', sortOrder: 2, name: { en: 'Front Seat Covers (Demo)', hi: 'फ्रंट सीट कवर (डेमो)' }, description: { en: 'Demo category: front seat pairs.', hi: 'डेमो श्रेणी: आगे की सीटों के जोड़े।' } },
  { slug: 'steering-covers', sortOrder: 3, name: { en: 'Steering Wheel Covers (Demo)', hi: 'स्टीयरिंग व्हील कवर (डेमो)' }, description: { en: 'Demo category: steering wheel covers.', hi: 'डेमो श्रेणी: स्टीयरिंग व्हील कवर।' } },
];

type DemoProduct = {
  sku: string;
  slug: string;
  category: string;
  material: 'leather' | 'leatherette' | 'pvc' | 'fabric' | 'other';
  name: { en: string; hi: string };
  priceMinor: number;
  salePriceMinor: number | null;
  published: boolean;
  featured: boolean;
  colours: Array<{ name: { en: string; hi: string }; code: string }>;
  vehicles: Array<{ make: string; model: string; yearFrom: number; yearTo?: number }>;
};

const BLACK = { en: 'Black', hi: 'काला' };
const TAN = { en: 'Tan', hi: 'टैन' };
const GREY = { en: 'Grey', hi: 'ग्रे' };
const BLUE = { en: 'Blue', hi: 'नीला' };

const DEMO_PRODUCTS: DemoProduct[] = [
  { sku: 'DEMO-LTH-FS-001', slug: 'demo-leather-full-set', category: 'full-set-covers', material: 'leather', name: { en: 'Leather Full Set (Demo)', hi: 'लेदर फुल सेट (डेमो)' }, priceMinor: 1249900, salePriceMinor: 1099900, published: true, featured: true, colours: [{ name: BLACK, code: '#111111' }, { name: TAN, code: '#8b5a2b' }], vehicles: [{ make: 'Demo Make A', model: 'Demo Model 1', yearFrom: 2018, yearTo: 2024 }] },
  { sku: 'DEMO-LTE-FS-002', slug: 'demo-leatherette-full-set', category: 'full-set-covers', material: 'leatherette', name: { en: 'Leatherette Full Set (Demo)', hi: 'लेदरेट फुल सेट (डेमो)' }, priceMinor: 699900, salePriceMinor: null, published: true, featured: true, colours: [{ name: BLACK, code: '#1f1f1f' }, { name: GREY, code: '#6b7280' }, { name: BLUE, code: '#1d4ed8' }], vehicles: [{ make: 'Demo Make B', model: 'Demo Model 2', yearFrom: 2015, yearTo: 2023 }] },
  { sku: 'DEMO-PVC-FS-003', slug: 'demo-pvc-full-set', category: 'full-set-covers', material: 'pvc', name: { en: 'PVC Full Set (Demo)', hi: 'पीवीसी फुल सेट (डेमो)' }, priceMinor: 349900, salePriceMinor: 299900, published: true, featured: false, colours: [{ name: BLACK, code: '#0f0f0f' }], vehicles: [{ make: 'Demo Make C', model: 'Demo Model 3', yearFrom: 2012 }] },
  { sku: 'DEMO-FAB-FS-004', slug: 'demo-fabric-full-set', category: 'full-set-covers', material: 'fabric', name: { en: 'Fabric Full Set (Demo)', hi: 'फैब्रिक फुल सेट (डेमो)' }, priceMinor: 449900, salePriceMinor: null, published: true, featured: false, colours: [{ name: GREY, code: '#9ca3af' }], vehicles: [{ make: 'Demo Make A', model: 'Demo Model 4', yearFrom: 2019 }] },
  { sku: 'DEMO-LTH-FR-005', slug: 'demo-leather-front-pair', category: 'front-seat-covers', material: 'leather', name: { en: 'Leather Front Pair (Demo)', hi: 'लेदर फ्रंट जोड़ी (डेमो)' }, priceMinor: 499900, salePriceMinor: null, published: true, featured: false, colours: [{ name: TAN, code: '#8b5a2b' }], vehicles: [{ make: 'Demo Make B', model: 'Demo Model 5', yearFrom: 2020, yearTo: 2025 }] },
  { sku: 'DEMO-LTE-SW-006', slug: 'demo-leatherette-steering-cover', category: 'steering-covers', material: 'leatherette', name: { en: 'Leatherette Steering Cover (Demo)', hi: 'लेदरेट स्टीयरिंग कवर (डेमो)' }, priceMinor: 99900, salePriceMinor: 79900, published: true, featured: false, colours: [{ name: BLACK, code: '#1f1f1f' }, { name: BLUE, code: '#1d4ed8' }], vehicles: [] },
  { sku: 'DEMO-OTH-FR-007', slug: 'demo-mesh-front-pair-draft', category: 'front-seat-covers', material: 'other', name: { en: 'Mesh Front Pair (Demo, draft)', hi: 'मेश फ्रंट जोड़ी (डेमो, ड्राफ्ट)' }, priceMinor: 199900, salePriceMinor: null, published: false, featured: false, colours: [{ name: GREY, code: '#6b7280' }], vehicles: [] },
];

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.isProduction && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Refusing to seed demo data in production. Set ALLOW_DEMO_SEED=true only for a staging database.');
  }
  await connectDatabase(env.MONGODB_URI);

  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const c of DEMO_CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $set: { name: c.name, description: c.description, sortOrder: c.sortOrder, active: true } },
      { upsert: true, returnDocument: 'after' },
    );
    categoryIds.set(c.slug, doc._id);
  }

  for (const p of DEMO_PRODUCTS) {
    const categoryId = categoryIds.get(p.category)!;
    const body = {
      slug: p.slug,
      sku: p.sku,
      categoryId,
      material: p.material,
      name: p.name,
      description: {
        en: 'Demo product description. Replace with real product details in the admin dashboard.',
        hi: 'डेमो उत्पाद विवरण। एडमिन डैशबोर्ड में वास्तविक विवरण से बदलें।',
      },
      colours: p.colours.map((c) => ({ name: c.name, code: c.code.toLowerCase() })),
      compatibleVehicles: p.vehicles,
      stitching: [],
      priceMinor: p.priceMinor,
      salePriceMinor: p.salePriceMinor,
      availability: 'made_to_order' as const,
      published: p.published,
      featured: p.featured,
      seo: {
        title: p.name,
        description: { en: 'Demo product page.', hi: 'डेमो उत्पाद पेज।' },
      },
    };
    const effectivePriceMinor = p.salePriceMinor ?? p.priceMinor;
    await Product.updateOne({ sku: p.sku }, { $set: { ...body, effectivePriceMinor } }, { upsert: true, runValidators: true });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  if (!adminEmail || adminPassword.length < 12) {
    console.warn('ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) not set: owner account was not provisioned.');
  } else if (!(await User.exists({ email: adminEmail }))) {
    await User.create({ name: 'Owner', email: adminEmail, passwordHash: await hashPassword(adminPassword), role: 'owner', active: true });
    console.log(`Owner account created for ${adminEmail}`);
  } else {
    console.log('Owner account already exists; password left unchanged.');
  }

  console.log(`Seed complete: ${DEMO_CATEGORIES.length} demo categories, ${DEMO_PRODUCTS.length} demo products.`);
  await disconnectDatabase();
}

main().catch(async (err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});

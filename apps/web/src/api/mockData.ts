import type { MaterialInfo, PublicCategory, PublicProduct } from '@pcs/shared';

/**
 * DEMO DATA. Mirrors the API seed (services/api/src/scripts/seed.ts) so the site can be previewed
 * without a database. Every name is marked "(Demo)". Replace with real data in the admin.
 */
const NOW = '2026-01-01T00:00:00.000Z';

const CATS: PublicCategory[] = [
  { id: '0000000000000000000000c1', slug: 'full-set-covers', name: { en: 'Full Set Covers (Demo)', hi: 'फुल सेट कवर (डेमो)' }, description: { en: 'Demo category: complete seat sets.', hi: 'डेमो श्रेणी: पूरे सीट सेट।' }, sortOrder: 1 },
  { id: '0000000000000000000000c2', slug: 'front-seat-covers', name: { en: 'Front Seat Covers (Demo)', hi: 'फ्रंट सीट कवर (डेमो)' }, description: { en: 'Demo category: front seat pairs.', hi: 'डेमो श्रेणी: आगे की सीटों के जोड़े।' }, sortOrder: 2 },
  { id: '0000000000000000000000c3', slug: 'steering-covers', name: { en: 'Steering Wheel Covers (Demo)', hi: 'स्टीयरिंग व्हील कवर (डेमो)' }, description: { en: 'Demo category: steering wheel covers.', hi: 'डेमो श्रेणी: स्टीयरिंग व्हील कवर।' }, sortOrder: 3 },
];

const cat = (slug: string) => {
  const c = CATS.find((x) => x.slug === slug)!;
  return { id: c.id, slug: c.slug, name: c.name };
};

const DESC = {
  en: 'Demo product description. Replace with real product details in the admin dashboard.',
  hi: 'डेमो उत्पाद विवरण। एडमिन डैशबोर्ड में वास्तविक विवरण से बदलें।',
};

function product(p: {
  n: number;
  sku: string;
  slug: string;
  category: string;
  material: PublicProduct['material'];
  name: { en: string; hi: string };
  price: number;
  sale: number | null;
  featured: boolean;
  colours: Array<{ name: { en: string; hi: string }; code: string }>;
  vehicles: PublicProduct['compatibleVehicles'];
}): PublicProduct {
  return {
    id: String(p.n).padStart(24, '0'),
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    description: DESC,
    category: cat(p.category),
    material: p.material,
    colours: p.colours,
    compatibleVehicles: p.vehicles,
    stitching: [],
    priceMinor: p.price,
    salePriceMinor: p.sale,
    currency: 'INR',
    availability: 'made_to_order',
    featured: p.featured,
    images: [],
    seo: { title: p.name, description: { en: 'Demo product page.', hi: 'डेमो उत्पाद पेज।' } },
    updatedAt: NOW,
  };
}

const BLACK = { en: 'Black', hi: 'काला' };
const TAN = { en: 'Tan', hi: 'टैन' };
const GREY = { en: 'Grey', hi: 'ग्रे' };
const BLUE = { en: 'Blue', hi: 'नीला' };

/** Published demo products only (the unpublished demo draft is intentionally excluded, as on the API). */
export const DEMO_PRODUCTS: PublicProduct[] = [
  product({ n: 1, sku: 'DEMO-LTH-FS-001', slug: 'demo-leather-full-set', category: 'full-set-covers', material: 'leather', name: { en: 'Leather Full Set (Demo)', hi: 'लेदर फुल सेट (डेमो)' }, price: 1249900, sale: 1099900, featured: true, colours: [{ name: BLACK, code: '#111111' }, { name: TAN, code: '#8b5a2b' }], vehicles: [{ make: 'Demo Make A', model: 'Demo Model 1', yearFrom: 2018, yearTo: 2024 }] }),
  product({ n: 2, sku: 'DEMO-LTE-FS-002', slug: 'demo-leatherette-full-set', category: 'full-set-covers', material: 'leatherette', name: { en: 'Leatherette Full Set (Demo)', hi: 'लेदरेट फुल सेट (डेमो)' }, price: 699900, sale: null, featured: true, colours: [{ name: BLACK, code: '#1f1f1f' }, { name: GREY, code: '#6b7280' }, { name: BLUE, code: '#1d4ed8' }], vehicles: [{ make: 'Demo Make B', model: 'Demo Model 2', yearFrom: 2015, yearTo: 2023 }] }),
  product({ n: 3, sku: 'DEMO-PVC-FS-003', slug: 'demo-pvc-full-set', category: 'full-set-covers', material: 'pvc', name: { en: 'PVC Full Set (Demo)', hi: 'पीवीसी फुल सेट (डेमो)' }, price: 349900, sale: 299900, featured: false, colours: [{ name: BLACK, code: '#0f0f0f' }], vehicles: [{ make: 'Demo Make C', model: 'Demo Model 3', yearFrom: 2012 }] }),
  product({ n: 4, sku: 'DEMO-FAB-FS-004', slug: 'demo-fabric-full-set', category: 'full-set-covers', material: 'fabric', name: { en: 'Fabric Full Set (Demo)', hi: 'फैब्रिक फुल सेट (डेमो)' }, price: 449900, sale: null, featured: false, colours: [{ name: GREY, code: '#9ca3af' }], vehicles: [{ make: 'Demo Make A', model: 'Demo Model 4', yearFrom: 2019 }] }),
  product({ n: 5, sku: 'DEMO-LTH-FR-005', slug: 'demo-leather-front-pair', category: 'front-seat-covers', material: 'leather', name: { en: 'Leather Front Pair (Demo)', hi: 'लेदर फ्रंट जोड़ी (डेमो)' }, price: 499900, sale: null, featured: false, colours: [{ name: TAN, code: '#8b5a2b' }], vehicles: [{ make: 'Demo Make B', model: 'Demo Model 5', yearFrom: 2020, yearTo: 2025 }] }),
  product({ n: 6, sku: 'DEMO-LTE-SW-006', slug: 'demo-leatherette-steering-cover', category: 'steering-covers', material: 'leatherette', name: { en: 'Leatherette Steering Cover (Demo)', hi: 'लेदरेट स्टीयरिंग कवर (डेमो)' }, price: 99900, sale: 79900, featured: false, colours: [{ name: BLACK, code: '#1f1f1f' }, { name: BLUE, code: '#1d4ed8' }], vehicles: [] }),
];

export const DEMO_CATEGORIES = CATS;

export const DEMO_MATERIALS: MaterialInfo[] = [
  { key: 'leather', label: { en: 'Leather', hi: 'लेदर' }, token: '--material-leather' },
  { key: 'leatherette', label: { en: 'Leatherette', hi: 'लेदरेट' }, token: '--material-leatherette' },
  { key: 'pvc', label: { en: 'PVC', hi: 'पीवीसी' }, token: '--material-pvc' },
  { key: 'fabric', label: { en: 'Fabric', hi: 'फैब्रिक' }, token: '--material-fabric' },
  { key: 'other', label: { en: 'Other', hi: 'अन्य' }, token: '--material-other' },
];

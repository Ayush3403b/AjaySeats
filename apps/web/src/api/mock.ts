import { inquiryCreateSchema, LANGUAGES, type InquiryCreateInput, type InquiryReceipt, type Paginated, type PublicProduct, type SortOption } from '@pcs/shared';
import type { ApiClient, CatalogueQuery, PublicSettings } from './client.js';
import { DEMO_CATEGORIES, DEMO_MATERIALS, DEMO_PRODUCTS } from './mockData.js';
import { ApiError } from './http.js';

const LATENCY_MS = 350;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sortProducts(items: PublicProduct[], sort: SortOption): PublicProduct[] {
  const price = (p: PublicProduct) => p.salePriceMinor ?? p.priceMinor;
  const copy = [...items];
  if (sort === 'price_asc') return copy.sort((a, b) => price(a) - price(b));
  if (sort === 'price_desc') return copy.sort((a, b) => price(b) - price(a));
  return copy;
}

/**
 * Demo client with the same contract as HttpApiClient. Filtering mirrors the API rules.
 * createInquiry validates with the shared schema but saves nothing; references are prefixed DEMO-.
 */
export class MockApiClient implements ApiClient {
  readonly mode = 'demo' as const;
  private demoCounter = 0;

  async getProducts(query: CatalogueQuery): Promise<Paginated<PublicProduct>> {
    await wait(LATENCY_MS);
    const q = query.q?.trim().toLowerCase();
    let items = DEMO_PRODUCTS.filter((p) => {
      if (q && !(p.name.en.toLowerCase().includes(q) || p.name.hi.includes(q) || p.sku.toLowerCase().includes(q))) return false;
      if (query.category && p.category.slug !== query.category) return false;
      if (query.material && p.material !== query.material) return false;
      if (query.colour && !p.colours.some((c) => c.code.toLowerCase() === query.colour!.toLowerCase())) return false;
      if (query.make && !p.compatibleVehicles.some((v) => v.make.toLowerCase() === query.make!.toLowerCase())) return false;
      if (query.model && !p.compatibleVehicles.some((v) => v.model.toLowerCase() === query.model!.toLowerCase())) return false;
      const effective = p.salePriceMinor ?? p.priceMinor;
      if (query.minPrice !== undefined && effective < query.minPrice) return false;
      if (query.maxPrice !== undefined && effective > query.maxPrice) return false;
      if (query.featured && !p.featured) return false;
      return true;
    });
    items = sortProducts(items, query.sort ?? 'latest');
    const pageSize = query.pageSize ?? 12;
    const page = query.page ?? 1;
    const total = items.length;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getProduct(slug: string): Promise<PublicProduct> {
    await wait(LATENCY_MS);
    const product = DEMO_PRODUCTS.find((p) => p.slug === slug);
    if (!product) throw new ApiError(404, 'NOT_FOUND', 'Product not found');
    return product;
  }

  async getCategories() {
    await wait(LATENCY_MS / 2);
    return { items: DEMO_CATEGORIES };
  }

  async getMaterials() {
    await wait(LATENCY_MS / 2);
    return { items: DEMO_MATERIALS };
  }

  async getSettings(): Promise<PublicSettings> {
    await wait(LATENCY_MS / 2);
    return { whatsappNumber: null, currency: 'INR', languages: [...LANGUAGES] };
  }

  async createInquiry(input: InquiryCreateInput): Promise<InquiryReceipt> {
    await wait(LATENCY_MS * 2);
    const parsed = inquiryCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted fields', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    this.demoCounter += 1;
    return {
      reference: `DEMO-INQ-2026-${String(this.demoCounter).padStart(6, '0')}`,
      submittedAt: new Date().toISOString(),
      language: parsed.data.language,
    };
  }
}

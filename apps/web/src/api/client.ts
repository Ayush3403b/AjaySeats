import type {
  InquiryCreateInput,
  InquiryReceipt,
  Language,
  Material,
  MaterialInfo,
  Paginated,
  PublicCategory,
  PublicProduct,
  SortOption,
} from '@pcs/shared';

/** Query for the public catalogue. Mirrors productListQuerySchema on the server. */
export interface CatalogueQuery {
  q?: string;
  category?: string;
  material?: Material;
  colour?: string;
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  featured?: boolean;
}

export interface PublicSettings {
  whatsappNumber: string | null;
  currency: 'INR';
  languages: Language[];
}

/**
 * The only contract the UI depends on. Two implementations exist:
 * HttpApiClient (real API) and MockApiClient (clearly labelled demo data, same contract).
 */
export interface ApiClient {
  readonly mode: 'api' | 'demo';
  getProducts(query: CatalogueQuery): Promise<Paginated<PublicProduct>>;
  getProduct(slug: string): Promise<PublicProduct>;
  getCategories(): Promise<{ items: PublicCategory[] }>;
  getMaterials(): Promise<{ items: MaterialInfo[] }>;
  getSettings(): Promise<PublicSettings>;
  createInquiry(input: InquiryCreateInput): Promise<InquiryReceipt>;
}

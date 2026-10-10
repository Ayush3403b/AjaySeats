import type { InquiryCreateInput, InquiryReceipt, Paginated, PublicCategory, PublicProduct, MaterialInfo } from '@pcs/shared';
import type { ApiClient, CatalogueQuery, PublicSettings } from './client.js';

/** Error with the server's stable code, so the UI can translate it. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

export function toQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

export class HttpApiClient implements ApiClient {
  readonly mode = 'api' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args)) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Network request failed');
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ErrorEnvelope | null;
      throw new ApiError(res.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? res.statusText, body?.error?.details);
    }
    return (await res.json()) as T;
  }

  getProducts(query: CatalogueQuery): Promise<Paginated<PublicProduct>> {
    return this.request(`/products${toQueryString({ ...query, featured: query.featured === undefined ? undefined : String(query.featured) })}`);
  }

  getProduct(slug: string): Promise<PublicProduct> {
    return this.request(`/products/${encodeURIComponent(slug)}`);
  }

  getCategories(): Promise<{ items: PublicCategory[] }> {
    return this.request('/categories');
  }

  getMaterials(): Promise<{ items: MaterialInfo[] }> {
    return this.request('/materials');
  }

  getSettings(): Promise<PublicSettings> {
    return this.request('/settings/public');
  }

  createInquiry(input: InquiryCreateInput): Promise<InquiryReceipt> {
    return this.request('/inquiries', { method: 'POST', body: JSON.stringify(input) });
  }
}

import { describe, expect, it, vi } from 'vitest';
import { ApiError, HttpApiClient, toQueryString } from './http.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('toQueryString', () => {
  it('drops empty values and keeps the rest', () => {
    expect(toQueryString({ q: 'leather', category: undefined, page: 2, empty: '' })).toBe('?q=leather&page=2');
    expect(toQueryString({})).toBe('');
  });
});

describe('HttpApiClient', () => {
  it('calls the catalogue endpoint under the base URL with the query string', async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse(200, { items: [], page: 1, pageSize: 12, total: 0, totalPages: 1 }));
    const client = new HttpApiClient('/api/v1/', fetchMock as unknown as typeof fetch);
    await client.getProducts({ material: 'leather', maxPrice: 500000, page: 2 });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toBe('/api/v1/products?material=leather&maxPrice=500000&page=2');
  });

  it('maps the server error envelope to an ApiError with the stable code', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(422, { error: { code: 'VALIDATION_FAILED', message: 'Please check', details: [{ path: 'city', message: 'x' }] } }),
    );
    const client = new HttpApiClient('/api/v1', fetchMock as unknown as typeof fetch);
    await expect(client.createInquiry({} as never)).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      details: [{ path: 'city', message: 'x' }],
    });
  });

  it('reports a network failure as NETWORK rather than a generic error', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = new HttpApiClient('/api/v1', fetchMock as unknown as typeof fetch);
    const err = await client.getSettings().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('NETWORK');
  });
});

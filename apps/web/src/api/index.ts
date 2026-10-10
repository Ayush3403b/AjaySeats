import type { ApiClient } from './client.js';
import { HttpApiClient } from './http.js';
import { MockApiClient } from './mock.js';

/**
 * Chooses the data source at build time:
 * - VITE_DATA_SOURCE=demo, or no VITE_API_BASE_URL  -> MockApiClient (labelled demo data)
 * - otherwise                                        -> HttpApiClient against VITE_API_BASE_URL
 */
function createClient(): ApiClient {
  const forced = import.meta.env.VITE_DATA_SOURCE;
  const base = import.meta.env.VITE_API_BASE_URL;
  if (forced === 'demo' || !base) return new MockApiClient();
  return new HttpApiClient(base);
}

export const api: ApiClient = createClient();
export { ApiError } from './http.js';
export type { CatalogueQuery, PublicSettings } from './client.js';

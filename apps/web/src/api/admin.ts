import type {
  AdminCampaign,
  AdminCampaignRecipient,
  AdminCustomer,
  AdminCustomerDetail,
  AdminInquiryDetail,
  AdminInquiryListItem,
  AdminProduct,
  CampaignCreateInput,
  CampaignStatus,
  CampaignUpdateInput,
  CustomerEligibility,
  InquiryStatus,
  Paginated,
  ProductCreateInput,
  RecipientLink,
  SessionInfo,
  UploadSignature,
} from '@pcs/shared';
import { ApiError, toQueryString } from './http.js';

/**
 * Typed client for the owner/staff admin endpoints. Uses the session cookie (same-origin) and
 * sends the CSRF token from the last sign-in or session check on every unsafe request.
 * Admin responses are never cached.
 */
export class AdminApi {
  private csrfToken: string | null = null;

  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const method = (init.method ?? 'GET').toUpperCase();
    const unsafe = method !== 'GET' && method !== 'HEAD';
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        method,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(unsafe && this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
        },
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Network request failed');
    }
    if (res.status === 204) return undefined as T;
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
    if (!res.ok) {
      throw new ApiError(res.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? res.statusText, body?.error?.details);
    }
    return body as T;
  }

  async session(): Promise<SessionInfo> {
    const s = await this.request<SessionInfo>('/auth/me');
    this.csrfToken = s.csrfToken;
    return s;
  }

  async login(email: string, password: string): Promise<SessionInfo> {
    const s = await this.request<SessionInfo>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.csrfToken = s.csrfToken;
    return s;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', { method: 'POST' });
    } finally {
      this.csrfToken = null;
    }
  }

  listProducts(query: { page: number; pageSize: number; q?: string; status?: 'published' | 'draft' | 'archived' }): Promise<Paginated<AdminProduct>> {
    return this.request(`/admin/products${toQueryString(query)}`);
  }

  getProduct(id: string): Promise<AdminProduct> {
    return this.request(`/admin/products/${encodeURIComponent(id)}`);
  }

  createProduct(input: ProductCreateInput): Promise<AdminProduct> {
    return this.request('/admin/products', { method: 'POST', body: JSON.stringify(input) });
  }

  updateProduct(id: string, input: Partial<ProductCreateInput>): Promise<AdminProduct> {
    return this.request(`/admin/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  setPublished(id: string, published: boolean): Promise<AdminProduct> {
    return this.request(`/admin/products/${encodeURIComponent(id)}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) });
  }

  setArchived(id: string, archived: boolean): Promise<AdminProduct> {
    return this.request(`/admin/products/${encodeURIComponent(id)}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) });
  }

  deleteProduct(id: string): Promise<void> {
    return this.request(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  listInquiries(query: { page: number; pageSize: number; status?: InquiryStatus; q?: string }): Promise<Paginated<AdminInquiryListItem>> {
    return this.request(`/admin/inquiries${toQueryString(query)}`);
  }

  getInquiry(id: string): Promise<AdminInquiryDetail> {
    return this.request(`/admin/inquiries/${encodeURIComponent(id)}`);
  }

  updateInquiryStatus(id: string, status: InquiryStatus, note?: string): Promise<AdminInquiryDetail> {
    return this.request(`/admin/inquiries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(note ? { status, note } : { status }),
    });
  }

  async addNote(id: string, text: string): Promise<AdminInquiryDetail['notes']> {
    const res = await this.request<{ notes: AdminInquiryDetail['notes'] }>(`/admin/inquiries/${encodeURIComponent(id)}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
    return res.notes;
  }

  /** Returns a click-to-chat URL. Opening it is NOT a delivery confirmation. */
  whatsappLink(id: string): Promise<{ url: string; language: 'en' | 'hi' }> {
    return this.request(`/admin/inquiries/${encodeURIComponent(id)}/whatsapp-link`, { method: 'POST' });
  }
  // ---- Uploads ----

  /**
   * Signed direct upload to the image host. The API signs; the browser uploads the file itself,
   * so the file never passes through this API. Rejects with UPLOAD_FAILED if the host refuses it.
   */
  async uploadProductImage(file: File): Promise<{ url: string; publicId: string }> {
    const sig = await this.request<UploadSignature>('/admin/uploads/signature', { method: 'POST' });
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('folder', sig.folder);
    form.append('signature', sig.signature);
    let res: Response;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/image/upload`, {
        method: 'POST',
        body: form,
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Network request failed');
    }
    const body = (await res.json().catch(() => null)) as { secure_url?: string; public_id?: string } | null;
    if (!res.ok || !body?.secure_url || !body.public_id) {
      throw new ApiError(res.status || 502, 'UPLOAD_FAILED', 'The image could not be uploaded. Try a smaller JPEG, PNG or WebP file.');
    }
    return { url: body.secure_url, publicId: body.public_id };
  }

  // ---- Customers ----

  listCustomers(query: { page: number; pageSize: number; q?: string; eligibility?: CustomerEligibility }): Promise<Paginated<AdminCustomer>> {
    return this.request(`/admin/customers${toQueryString(query)}`);
  }

  getCustomer(id: string): Promise<AdminCustomerDetail> {
    return this.request(`/admin/customers/${encodeURIComponent(id)}`);
  }

  /** Opting out is open to staff. Opting back in is owner-only; the API returns 403 for staff. */
  setCustomerOptOut(id: string, optedOut: boolean, note?: string): Promise<AdminCustomer> {
    return this.request(`/admin/customers/${encodeURIComponent(id)}/opt-out`, {
      method: 'PATCH',
      body: JSON.stringify(note ? { optedOut, note } : { optedOut }),
    });
  }

  // ---- Campaigns ----

  listCampaigns(query: { page: number; pageSize: number; status?: CampaignStatus }): Promise<Paginated<AdminCampaign>> {
    return this.request(`/admin/campaigns${toQueryString(query)}`);
  }

  getCampaign(id: string): Promise<AdminCampaign> {
    return this.request(`/admin/campaigns/${encodeURIComponent(id)}`);
  }

  createCampaign(input: CampaignCreateInput): Promise<AdminCampaign> {
    return this.request('/admin/campaigns', { method: 'POST', body: JSON.stringify(input) });
  }

  updateCampaign(id: string, input: CampaignUpdateInput): Promise<AdminCampaign> {
    return this.request(`/admin/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  /** Fixes the recipient list. Only consented, non-opted-out customers become recipients. */
  prepareCampaign(id: string): Promise<AdminCampaign> {
    return this.request(`/admin/campaigns/${encodeURIComponent(id)}/prepare`, { method: 'POST' });
  }

  listRecipients(campaignId: string, query: { page: number; pageSize: number }): Promise<Paginated<AdminCampaignRecipient>> {
    return this.request(`/admin/campaigns/${encodeURIComponent(campaignId)}/recipients${toQueryString(query)}`);
  }

  /** Builds a click-to-chat link. Eligibility is re-checked here. Nothing is recorded server-side. */
  recipientLink(campaignId: string, recipientId: string): Promise<RecipientLink> {
    return this.request(
      `/admin/campaigns/${encodeURIComponent(campaignId)}/recipients/${encodeURIComponent(recipientId)}/link`,
      { method: 'POST' },
    );
  }

  markLinkOpened(campaignId: string, recipientId: string): Promise<AdminCampaignRecipient> {
    return this.request(
      `/admin/campaigns/${encodeURIComponent(campaignId)}/recipients/${encodeURIComponent(recipientId)}/link-opened`,
      { method: 'POST' },
    );
  }

  markSentConfirmed(campaignId: string, recipientId: string): Promise<AdminCampaignRecipient> {
    return this.request(
      `/admin/campaigns/${encodeURIComponent(campaignId)}/recipients/${encodeURIComponent(recipientId)}/sent-confirmed`,
      { method: 'POST' },
    );
  }
}

export const adminApi = new AdminApi(((import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1'));

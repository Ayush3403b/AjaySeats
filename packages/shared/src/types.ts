import type { Availability, CampaignStatus, InquiryStatus, Language, Material } from './enums.js';

export interface LocalizedText {
  en: string;
  hi: string;
}

export interface PublicColour {
  name: LocalizedText;
  code: string;
}

export interface PublicVehicle {
  make: string;
  model: string;
  yearFrom: number;
  yearTo?: number;
}

export interface PublicImage {
  url: string;
  alt: LocalizedText;
  order: number;
}

/** Shape returned by public catalogue endpoints. Drafts and archived products are never included. */
export interface PublicProduct {
  id: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  description: LocalizedText;
  category: { id: string; slug: string; name: LocalizedText };
  material: Material;
  colours: PublicColour[];
  compatibleVehicles: PublicVehicle[];
  stitching: LocalizedText[];
  priceMinor: number;
  salePriceMinor: number | null;
  currency: 'INR';
  availability: Availability;
  featured: boolean;
  images: PublicImage[];
  seo: { title: LocalizedText; description: LocalizedText };
  updatedAt: string;
}

export interface PublicCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
}

export interface MaterialInfo {
  key: Material;
  label: LocalizedText;
  token: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface InquiryReceipt {
  reference: string;
  submittedAt: string;
  language: Language;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
}

export interface SessionInfo {
  user: AuthUser;
  csrfToken: string;
}

export interface AdminProductImage extends PublicImage {
  publicId: string;
}

export interface AdminProduct extends PublicProduct {
  images: AdminProductImage[];
  published: boolean;
  archived: boolean;
  createdAt: string;
}

export interface AdminInquiryListItem {
  id: string;
  reference: string;
  customerName: string;
  phoneMasked: string;
  city: string;
  status: InquiryStatus;
  itemCount: number;
  createdAt: string;
}

export interface AdminInquiryDetail extends AdminInquiryListItem {
  phone: string;
  language: Language;
  vehicle: { make: string; model: string; year: number };
  material: Material | null;
  colour: string | null;
  message: string;
  items: Array<{
    productId: string;
    sku: string;
    name: LocalizedText;
    quantity: number;
    unitPriceMinorSnapshot: number;
    salePriceMinorSnapshot: number | null;
  }>;
  statusHistory: Array<{ status: InquiryStatus; at: string; note?: string }>;
  notes: Array<{ text: string; at: string; by: string }>;
  consentMarketing: boolean;
}

export interface AdminCustomer {
  id: string;
  name: string;
  phoneMasked: string;
  city: string;
  language: Language;
  consentMarketing: boolean;
  consentAt: string | null;
  optedOut: boolean;
  optedOutAt: string | null;
  inquiryCount: number;
  lastInquiryAt: string | null;
  /** True only when marketing consent is given and the customer has not opted out. */
  eligible: boolean;
}

export interface AdminCustomerDetail extends AdminCustomer {
  phone: string;
  optedOutNote: string;
  inquiries: Array<{ reference: string; status: InquiryStatus; createdAt: string }>;
}

export interface AdminCampaign {
  id: string;
  name: string;
  language: Language;
  message: string;
  city: string | null;
  status: CampaignStatus;
  createdAt: string;
  preparedAt: string | null;
  /** Set at preparation time. Recipients are only created for eligible customers. */
  counts: { eligible: number; excludedNoConsent: number; excludedOptedOut: number };
  linkOpenedCount: number;
  sentConfirmedCount: number;
}

export interface AdminCampaignRecipient {
  id: string;
  customerName: string;
  phoneMasked: string;
  /** Current eligibility, which may have changed since the campaign was prepared. */
  eligible: boolean;
  linkOpenedAt: string | null;
  sentConfirmedAt: string | null;
}

export interface RecipientLink {
  url: string;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

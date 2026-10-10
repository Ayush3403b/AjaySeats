import { z } from 'zod';
import {
  AVAILABILITY,
  CAMPAIGN_STATUSES,
  CUSTOMER_ELIGIBILITY,
  INQUIRY_STATUSES,
  LANGUAGES,
  MATERIALS,
  SORT_OPTIONS,
} from './enums.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
const sku = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, 'SKU: A-Z, 0-9 and hyphens, 2-40 chars');
const hexColour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colour must be #RRGGBB');
const year = z.int().min(1980).max(2100);
/** Paise cap: 10,00,000 INR. */
const paise = z.int().min(0).max(100_000_000);

export function localizedText(max: number, requireHindi = false) {
  return z.strictObject({
    en: z.string().trim().min(1, 'English text is required').max(max),
    hi: requireHindi
      ? z.string().trim().min(1, 'Hindi text is required').max(max)
      : z.string().trim().max(max).default(''),
  });
}

export const colourSchema = z.strictObject({
  name: localizedText(60),
  code: hexColour,
});

export const vehicleSchema = z
  .strictObject({
    make: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    yearFrom: year,
    yearTo: year.optional(),
  })
  .refine((v) => v.yearTo === undefined || v.yearTo >= v.yearFrom, {
    message: 'yearTo must be on or after yearFrom',
    path: ['yearTo'],
  });

/**
 * Field shape with NO zod defaults. Defaults are applied in the service layer, because zod's
 * .partial() keeps defaults and would silently overwrite stored values on PATCH.
 */
/** Only images hosted on the image provider are accepted. The API also checks the account name. */
const productImageSchema = z.strictObject({
  url: z
    .string()
    .max(500)
    .url()
    .regex(/^https:\/\/res\.cloudinary\.com\//, 'Images must come from the image host'),
  publicId: z.string().trim().min(3).max(200),
  alt: localizedText(160),
  order: z.number().int().min(0).max(50),
});

const productShape = {
  slug,
  sku,
  categoryId: objectId,
  material: z.enum(MATERIALS),
  name: localizedText(120, true),
  description: localizedText(2000),
  colours: z.array(colourSchema).max(20).optional(),
  compatibleVehicles: z.array(vehicleSchema).max(60).optional(),
  stitching: z.array(localizedText(120)).max(10).optional(),
  priceMinor: paise,
  salePriceMinor: paise.nullable().optional(),
  availability: z.enum(AVAILABILITY).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  seo: z
    .strictObject({
      title: localizedText(70),
      description: localizedText(160),
    })
    .optional(),
  /** Images are uploaded straight to the image host; only its URLs and ids are stored here. */
  images: z.array(productImageSchema).max(10).optional(),
};

/** Create: sale price must be strictly below regular price. */
export const productCreateSchema = z
  .strictObject(productShape)
  .superRefine((p, ctx) => {
    if (p.salePriceMinor !== undefined && p.salePriceMinor !== null && p.salePriceMinor >= p.priceMinor) {
      ctx.addIssue({
        code: 'custom',
        path: ['salePriceMinor'],
        message: 'Sale price must be lower than the regular price',
      });
    }
  });

/**
 * Update: whitelisted fields only (strict object rejects unknown keys = mass-assignment protection).
 * Cross-field sale-vs-regular check is repeated in the service against the stored document.
 */
export const productUpdateSchema = z.strictObject(productShape).partial();

export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: slug.optional(),
  material: z.enum(MATERIALS).optional(),
  colour: hexColour.optional(),
  make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sort: z.enum(SORT_OPTIONS).default('latest'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
});

export const inquiryCreateSchema = z.strictObject({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  countryCode: z.string().default('+91'),
  mobile: z.string().trim().min(6, 'Enter a valid mobile number').max(20),
  language: z.enum(LANGUAGES).default('en'),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  vehicle: z.strictObject({
    make: z.string().trim().min(1, 'Enter the car make').max(60),
    model: z.string().trim().min(1, 'Enter the car model').max(60),
    year,
  }),
  items: z
    .array(
      z.strictObject({
        productId: objectId,
        quantity: z.int().min(1).max(500),
      }),
    )
    .min(1, 'Choose at least one product')
    .max(10),
  material: z.enum(MATERIALS).nullable().optional(),
  colour: hexColour.nullable().optional(),
  message: z.string().trim().max(1000).default(''),
  consentMarketing: z.boolean().default(false),
  /** Honeypot: must be empty. Bots fill it. */
  website: z.string().max(0).optional(),
  /** Client render time (ms since epoch). Used for minimum-time spam check. */
  formStartedAt: z.coerce.number().int().positive(),
});

export const inquiryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(INQUIRY_STATUSES).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  productId: objectId.optional(),
});

export const inquiryStatusSchema = z.strictObject({
  status: z.enum(INQUIRY_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const inquiryNoteSchema = z.strictObject({
  text: z.string().trim().min(1).max(1000),
});

export const loginSchema = z.strictObject({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
});

/** Customers are created from quote requests. Eligibility filters are applied server-side. */
export const customerListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  eligibility: z.enum(CUSTOMER_ELIGIBILITY).optional(),
});

/** Staff may opt a customer out. Only owners may opt a customer back in (enforced in the API route). */
export const customerOptOutSchema = z.strictObject({
  optedOut: z.boolean(),
  note: z.string().trim().max(300).optional(),
});

const campaignMessage = z.string().trim().min(10).max(600);

/** Use {name} in the message; it is replaced with the customer's name per recipient. */
export const campaignCreateSchema = z.strictObject({
  name: z.string().trim().min(3).max(120),
  language: z.enum(LANGUAGES),
  message: campaignMessage,
  city: z.string().trim().min(2).max(80).nullable().optional(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const campaignListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerOptOutInput = z.infer<typeof customerOptOutSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
export type InquiryListQuery = z.infer<typeof inquiryListQuerySchema>;
export type InquiryStatusInput = z.infer<typeof inquiryStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

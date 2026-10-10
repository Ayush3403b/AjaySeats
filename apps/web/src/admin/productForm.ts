import { z } from 'zod';
import { AVAILABILITY, MATERIALS, type AdminProduct, type ProductCreateInput } from '@pcs/shared';
import { isImageHostUrl } from './imageUpload.js';

/** Form model. Money is typed in rupees here and converted to integer paise only in toPayload(). */

const RUPEES = /^\d{1,8}(\.\d{1,2})?$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const SKU = /^[A-Za-z0-9][A-Za-z0-9-]{1,39}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YEAR = /^\d{4}$/;

function localized(max: number, enRequired: boolean, hiRequired: boolean) {
  const en = z.string().trim().max(max, 'admin.errors.tooLong');
  const hi = z.string().trim().max(max, 'admin.errors.tooLong');
  return z.object({
    en: enRequired ? en.min(1, 'admin.errors.required') : en,
    hi: hiRequired ? hi.min(1, 'admin.errors.required') : hi,
  });
}

export const productFormSchema = z
  .object({
    slug: z.string().trim().min(2, 'admin.errors.slug').max(80, 'admin.errors.slug').regex(SLUG, 'admin.errors.slug'),
    sku: z.string().trim().refine((v) => SKU.test(v), 'admin.errors.sku'),
    categoryId: z.string().min(1, 'admin.errors.required'),
    material: z.enum(MATERIALS),
    name: localized(120, true, true),
    description: localized(2000, true, false),
    priceRupees: z.string().trim().regex(RUPEES, 'admin.errors.price'),
    salePriceRupees: z
      .string()
      .trim()
      .refine((v) => v === '' || RUPEES.test(v), 'admin.errors.price'),
    availability: z.enum(AVAILABILITY),
    featured: z.boolean(),
    published: z.boolean(),
    colours: z
      .array(
        z.object({
          name: localized(60, true, false),
          code: z.string().regex(HEX, 'admin.errors.colour'),
        }),
      )
      .max(20, 'admin.errors.max'),
    vehicles: z
      .array(
        z.object({
          make: z.string().trim().min(1, 'admin.errors.required').max(60, 'admin.errors.tooLong'),
          model: z.string().trim().min(1, 'admin.errors.required').max(60, 'admin.errors.tooLong'),
          yearFrom: z.string().trim().regex(YEAR, 'admin.errors.year'),
          yearTo: z.string().trim().refine((v) => v === '' || YEAR.test(v), 'admin.errors.year'),
        }),
      )
      .max(60, 'admin.errors.max'),
    stitching: z.array(localized(120, true, false)).max(10, 'admin.errors.max'),
    seo: z.object({
      title: localized(70, true, false),
      description: localized(160, true, false),
    }),
    images: z
      .array(
        z.object({
          url: z.string().refine(isImageHostUrl, 'admin.errors.imageHost'),
          publicId: z.string().min(3, 'admin.errors.required'),
          // Alt text is required so every image has a description for screen readers and search.
          alt: localized(160, true, false),
        }),
      )
      .max(10, 'admin.errors.max'),
  })
  .superRefine((v, ctx) => {
    if (v.salePriceRupees !== '' && RUPEES.test(v.priceRupees) && rupeesToPaise(v.salePriceRupees) >= rupeesToPaise(v.priceRupees)) {
      ctx.addIssue({ code: 'custom', path: ['salePriceRupees'], message: 'admin.errors.saleBelowRegular' });
    }
    v.vehicles.forEach((veh, i) => {
      if (veh.yearTo !== '' && YEAR.test(veh.yearFrom) && YEAR.test(veh.yearTo) && Number(veh.yearTo) < Number(veh.yearFrom)) {
        ctx.addIssue({ code: 'custom', path: ['vehicles', i, 'yearTo'], message: 'admin.errors.yearOrder' });
      }
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Exact decimal conversion: "1234.5" -> 123450. Avoids float drift from Number * 100. */
export function rupeesToPaise(value: string): number {
  const [whole, frac = ''] = value.trim().split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

export function paiseToRupees(paise: number): string {
  const whole = Math.floor(paise / 100);
  const frac = String(paise % 100).padStart(2, '0');
  return frac === '00' ? String(whole) : `${whole}.${frac}`;
}

export function emptyProductForm(): ProductFormValues {
  return {
    slug: '',
    sku: '',
    categoryId: '',
    material: 'leather',
    name: { en: '', hi: '' },
    description: { en: '', hi: '' },
    priceRupees: '',
    salePriceRupees: '',
    availability: 'in_stock',
    featured: false,
    published: false,
    colours: [],
    vehicles: [],
    stitching: [],
    seo: { title: { en: '', hi: '' }, description: { en: '', hi: '' } },
    images: [],
  };
}

export function toFormValues(p: AdminProduct): ProductFormValues {
  return {
    slug: p.slug,
    sku: p.sku,
    categoryId: p.category.id,
    material: p.material,
    name: { en: p.name.en, hi: p.name.hi },
    description: { en: p.description.en, hi: p.description.hi },
    priceRupees: paiseToRupees(p.priceMinor),
    salePriceRupees: p.salePriceMinor === null ? '' : paiseToRupees(p.salePriceMinor),
    availability: p.availability,
    featured: p.featured,
    published: p.published,
    colours: p.colours.map((c) => ({ name: { en: c.name.en, hi: c.name.hi }, code: c.code })),
    vehicles: p.compatibleVehicles.map((v) => ({
      make: v.make,
      model: v.model,
      yearFrom: String(v.yearFrom),
      yearTo: v.yearTo === undefined ? '' : String(v.yearTo),
    })),
    stitching: p.stitching.map((s) => ({ en: s.en, hi: s.hi })),
    seo: { title: { en: p.seo.title.en, hi: p.seo.title.hi }, description: { en: p.seo.description.en, hi: p.seo.description.hi } },
    images: [...p.images]
      .sort((a, b) => a.order - b.order)
      .map((img) => ({ url: img.url, publicId: img.publicId, alt: { en: img.alt.en, hi: img.alt.hi } })),
  };
}

export function toPayload(v: ProductFormValues): ProductCreateInput {
  return {
    slug: v.slug.trim(),
    sku: v.sku.trim().toUpperCase(),
    categoryId: v.categoryId,
    material: v.material,
    name: { en: v.name.en.trim(), hi: v.name.hi.trim() },
    description: { en: v.description.en.trim(), hi: v.description.hi.trim() },
    priceMinor: rupeesToPaise(v.priceRupees),
    salePriceMinor: v.salePriceRupees === '' ? null : rupeesToPaise(v.salePriceRupees),
    availability: v.availability,
    featured: v.featured,
    published: v.published,
    colours: v.colours.map((c) => ({ name: { en: c.name.en.trim(), hi: c.name.hi.trim() }, code: c.code.toLowerCase() })),
    compatibleVehicles: v.vehicles.map((veh) => ({
      make: veh.make.trim(),
      model: veh.model.trim(),
      yearFrom: Number(veh.yearFrom),
      ...(veh.yearTo === '' ? {} : { yearTo: Number(veh.yearTo) }),
    })),
    stitching: v.stitching.map((s) => ({ en: s.en.trim(), hi: s.hi.trim() })),
    seo: {
      title: { en: v.seo.title.en.trim(), hi: v.seo.title.hi.trim() },
      description: { en: v.seo.description.en.trim(), hi: v.seo.description.hi.trim() },
    },
    // Order is the position in the editor. The first image is the main one on the site.
    images: v.images.map((img, i) => ({
      url: img.url,
      publicId: img.publicId,
      alt: { en: img.alt.en.trim(), hi: img.alt.hi.trim() },
      order: i,
    })),
  };
}

/**
 * Server validation paths use API field names (priceMinor, compatibleVehicles.0.yearTo).
 * Map them to form field names so the message lands on the right input. Returns null when unknown.
 */
export function serverPathToField(path: string): string | null {
  if (path === 'priceMinor') return 'priceRupees';
  if (path === 'salePriceMinor') return 'salePriceRupees';
  const veh = /^compatibleVehicles(\.\d+\.[A-Za-z]+)?$/.exec(path);
  if (veh) return `vehicles${veh[1] ?? ''}`;
  if (['slug', 'sku', 'categoryId', 'material', 'availability', 'featured', 'published'].includes(path)) return path;
  if (/^(name|description|seo|colours|stitching)(\.|$)/.test(path)) return path;
  // Image URLs have no input of their own, so a URL problem is shown as a general message.
  if (path === 'images' || /^images\.\d+\.alt\.(en|hi)$/.test(path)) return path;
  return null;
}

/** True for a rupee amount with at most two decimals, e.g. "1299" or "1299.50". */
export function isRupeeAmount(value: string): boolean {
  return RUPEES.test(value.trim());
}

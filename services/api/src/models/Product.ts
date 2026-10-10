import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { AVAILABILITY, MATERIALS, type Availability, type Material } from '@pcs/shared';
import { localizedSchema, type LocalizedAttrs } from './shared.js';

export interface ProductAttrs {
  slug: string;
  sku: string;
  categoryId: Types.ObjectId;
  material: Material;
  name: LocalizedAttrs;
  description: LocalizedAttrs;
  colours: Array<{ name: LocalizedAttrs; code: string }>;
  compatibleVehicles: Array<{ make: string; model: string; yearFrom: number; yearTo?: number }>;
  stitching: LocalizedAttrs[];
  /** Regular price in integer paise. */
  priceMinor: number;
  /** Optional sale price in integer paise; always < priceMinor. */
  salePriceMinor: number | null;
  /** Derived: salePriceMinor ?? priceMinor. Used for price filters and sorting. */
  effectivePriceMinor: number;
  currency: 'INR';
  availability: Availability;
  published: boolean;
  archived: boolean;
  featured: boolean;
  images: Array<{ url: string; publicId: string; alt: LocalizedAttrs; order: number }>;
  seo: { title: LocalizedAttrs; description: LocalizedAttrs };
}

const colourSchema = new Schema(
  {
    name: { type: localizedSchema, required: true },
    code: { type: String, required: true, match: /^#[0-9a-f]{6}$/ },
  },
  { _id: false },
);

const vehicleSchema = new Schema(
  {
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    yearFrom: { type: Number, required: true, min: 1980, max: 2100 },
    yearTo: { type: Number, min: 1980, max: 2100 },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: localizedSchema, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: true },
);

const productSchema = new Schema<ProductAttrs>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    material: { type: String, enum: MATERIALS, required: true, index: true },
    name: { type: localizedSchema, required: true },
    description: { type: localizedSchema, required: true },
    colours: { type: [colourSchema], default: [] },
    compatibleVehicles: { type: [vehicleSchema], default: [] },
    stitching: { type: [localizedSchema], default: [] },
    priceMinor: { type: Number, required: true, min: 0, max: 100_000_000 },
    salePriceMinor: { type: Number, default: null, min: 0, max: 100_000_000 },
    effectivePriceMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    availability: { type: String, enum: AVAILABILITY, default: 'made_to_order' },
    published: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    images: { type: [imageSchema], default: [] },
    seo: {
      title: { type: localizedSchema, required: true },
      description: { type: localizedSchema, required: true },
    },
  },
  { timestamps: true },
);

// Catalogue query indexes (public list: published + not archived, then filter/sort).
productSchema.index({ published: 1, archived: 1, effectivePriceMinor: 1 });
productSchema.index({ published: 1, archived: 1, createdAt: -1 });
productSchema.index({ published: 1, archived: 1, categoryId: 1 });
productSchema.index({ published: 1, archived: 1, material: 1 });
productSchema.index({ 'compatibleVehicles.make': 1, published: 1 });
productSchema.index({ 'colours.code': 1, published: 1 });

// Keep the derived price in sync and enforce sale < regular at the model layer too.
productSchema.pre('validate', function () {
  this.effectivePriceMinor = this.salePriceMinor ?? this.priceMinor;
  if (this.salePriceMinor !== null && this.salePriceMinor !== undefined && this.salePriceMinor >= this.priceMinor) {
    this.invalidate('salePriceMinor', 'Sale price must be lower than the regular price');
  }
});

export type ProductDoc = HydratedDocument<ProductAttrs>;
export const Product = mongoose.model<ProductAttrs>('Product', productSchema);

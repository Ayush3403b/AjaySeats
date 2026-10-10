import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';
import { INQUIRY_STATUSES, MATERIALS, type InquiryStatus, type Language, type Material } from '@pcs/shared';
import { localizedSchema, type LocalizedAttrs } from './shared.js';

export interface InquiryAttrs {
  reference: string;
  customerName: string;
  /** Normalized E.164, e.g. +919876543210. Never logged. */
  phone: string;
  language: Language;
  city: string;
  vehicle: { make: string; model: string; year: number };
  items: Array<{
    product: Types.ObjectId;
    sku: string;
    name: LocalizedAttrs;
    quantity: number;
    unitPriceMinorSnapshot: number;
    salePriceMinorSnapshot: number | null;
  }>;
  material: Material | null;
  colour: string | null;
  message: string;
  source: 'website';
  status: InquiryStatus;
  statusHistory: Array<{ status: InquiryStatus; at: Date; note?: string }>;
  notes: Array<{ text: string; at: Date; by: string }>;
  consent: { marketing: boolean; at: Date; source: string };
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<InquiryAttrs>(
  {
    reference: { type: String, required: true, unique: true, uppercase: true, maxlength: 24 },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, match: /^\+\d{8,15}$/ },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    vehicle: {
      make: { type: String, required: true, trim: true, maxlength: 60 },
      model: { type: String, required: true, trim: true, maxlength: 60 },
      year: { type: Number, required: true, min: 1980, max: 2100 },
    },
    items: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          sku: { type: String, required: true },
          name: { type: localizedSchema, required: true },
          quantity: { type: Number, required: true, min: 1, max: 500 },
          unitPriceMinorSnapshot: { type: Number, required: true, min: 0 },
          salePriceMinorSnapshot: { type: Number, default: null },
        },
      ],
      default: [],
    },
    material: { type: String, enum: [...MATERIALS, null], default: null },
    colour: { type: String, default: null },
    message: { type: String, default: '', maxlength: 1000 },
    source: { type: String, enum: ['website'], default: 'website' },
    status: { type: String, enum: INQUIRY_STATUSES, default: 'new' },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: INQUIRY_STATUSES, required: true },
          at: { type: Date, required: true },
          note: { type: String, maxlength: 500 },
        },
      ],
      default: [],
    },
    notes: {
      type: [{ text: { type: String, required: true, maxlength: 1000 }, at: Date, by: String }],
      default: [],
    },
    consent: {
      marketing: { type: Boolean, default: false },
      at: { type: Date, required: true },
      source: { type: String, default: 'quote_form' },
    },
  },
  { timestamps: true },
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ phone: 1 });
inquirySchema.index({ 'items.product': 1 });

export type InquiryDoc = HydratedDocument<InquiryAttrs>;
export const Inquiry = mongoose.model<InquiryAttrs>('Inquiry', inquirySchema);

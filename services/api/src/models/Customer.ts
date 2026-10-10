import mongoose, { Schema, type HydratedDocument } from 'mongoose';
import type { Language } from '@pcs/shared';

export interface CustomerAttrs {
  /** Normalized E.164. Unique: one customer record per phone number. */
  phone: string;
  name: string;
  city: string;
  language: Language;
  /**
   * Taken from the most recent quote request. Latest answer wins, so an unticked box stops
   * marketing eligibility. Staff opt-out is separate and sticky.
   */
  consent: { marketing: boolean; at: Date | null; source: string };
  /** Set only by staff. A new inquiry never clears it. */
  optedOutAt: Date | null;
  optedOutNote: string;
  inquiryCount: number;
  lastInquiryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerAttrs>(
  {
    phone: { type: String, required: true, unique: true, match: /^\+\d{8,15}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, default: '', trim: true, maxlength: 80 },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    consent: {
      marketing: { type: Boolean, default: false },
      at: { type: Date, default: null },
      source: { type: String, default: '', maxlength: 40 },
    },
    optedOutAt: { type: Date, default: null },
    optedOutNote: { type: String, default: '', maxlength: 300 },
    inquiryCount: { type: Number, default: 0, min: 0 },
    lastInquiryAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerSchema.index({ 'consent.marketing': 1, optedOutAt: 1, city: 1 });
customerSchema.index({ lastInquiryAt: -1 });

export type CustomerDocument = HydratedDocument<CustomerAttrs>;
export const Customer = mongoose.model<CustomerAttrs>('Customer', customerSchema);

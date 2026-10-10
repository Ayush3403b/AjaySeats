import mongoose, { Schema, type HydratedDocument } from 'mongoose';
import { CAMPAIGN_STATUSES, type CampaignStatus, type Language } from '@pcs/shared';

export interface CampaignAttrs {
  name: string;
  language: Language;
  /** Contains {name}, replaced per recipient when a link is generated. */
  message: string;
  city: string | null;
  status: CampaignStatus;
  preparedAt: Date | null;
  counts: { eligible: number; excludedNoConsent: number; excludedOptedOut: number };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<CampaignAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    language: { type: String, enum: ['en', 'hi'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    city: { type: String, default: null, trim: true, maxlength: 80 },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft' },
    preparedAt: { type: Date, default: null },
    counts: {
      eligible: { type: Number, default: 0, min: 0 },
      excludedNoConsent: { type: Number, default: 0, min: 0 },
      excludedOptedOut: { type: Number, default: 0, min: 0 },
    },
    createdBy: { type: String, default: '', maxlength: 120 },
  },
  { timestamps: true },
);

campaignSchema.index({ createdAt: -1 });

export type CampaignDocument = HydratedDocument<CampaignAttrs>;
export const Campaign = mongoose.model<CampaignAttrs>('Campaign', campaignSchema);

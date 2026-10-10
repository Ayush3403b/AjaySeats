import mongoose, { Schema, type Types } from 'mongoose';

export interface CampaignRecipientAttrs {
  campaign: Types.ObjectId;
  customer: Types.ObjectId;
  /** Copied at preparation time so the list still works if the customer record changes. */
  customerName: string;
  phone: string;
  /** Staff opened the wa.me link. Recorded by the staff member's own click, not by WhatsApp. */
  linkOpenedAt: Date | null;
  /** Staff confirmed they sent the message by hand. Stored separately from linkOpenedAt. */
  sentConfirmedAt: Date | null;
  sentConfirmedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const recipientSchema = new Schema<CampaignRecipientAttrs>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true, maxlength: 80 },
    phone: { type: String, required: true, match: /^\+\d{8,15}$/ },
    linkOpenedAt: { type: Date, default: null },
    sentConfirmedAt: { type: Date, default: null },
    sentConfirmedBy: { type: String, default: '', maxlength: 120 },
  },
  { timestamps: true },
);

recipientSchema.index({ campaign: 1, customer: 1 }, { unique: true });
recipientSchema.index({ campaign: 1, createdAt: 1 });

export const CampaignRecipient = mongoose.model<CampaignRecipientAttrs>('CampaignRecipient', recipientSchema);

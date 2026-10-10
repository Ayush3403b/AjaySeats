import type { QueryFilter, Types } from 'mongoose';
import type {
  AdminCampaign,
  AdminCampaignRecipient,
  CampaignCreateInput,
  CampaignListQuery,
  CampaignUpdateInput,
  RecipientLink,
} from '@pcs/shared';
import { maskPhone } from '@pcs/shared';
import { Campaign, type CampaignAttrs } from '../models/Campaign.js';
import { CampaignRecipient, type CampaignRecipientAttrs } from '../models/CampaignRecipient.js';
import { Customer, type CustomerAttrs } from '../models/Customer.js';
import { errors } from '../lib/errors.js';
import { whatsappProvider } from '../whatsapp/provider.js';
import { isEligible } from './customers.js';

const NOT_ELIGIBLE_MESSAGE =
  'This customer has not consented to marketing or has opted out, so no message can be prepared for them.';

type CampaignDoc = CampaignAttrs & { _id: Types.ObjectId };

export function renderCampaignMessage(message: string, customerName: string): string {
  return message.split('{name}').join(customerName);
}

async function countTracking(campaignId: Types.ObjectId) {
  const [linkOpenedCount, sentConfirmedCount] = await Promise.all([
    CampaignRecipient.countDocuments({ campaign: campaignId, linkOpenedAt: { $ne: null } }),
    CampaignRecipient.countDocuments({ campaign: campaignId, sentConfirmedAt: { $ne: null } }),
  ]);
  return { linkOpenedCount, sentConfirmedCount };
}

async function toAdminCampaign(doc: CampaignDoc): Promise<AdminCampaign> {
  const tracking = await countTracking(doc._id);
  return {
    id: String(doc._id),
    name: doc.name,
    language: doc.language,
    message: doc.message,
    city: doc.city ?? null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    preparedAt: doc.preparedAt ? doc.preparedAt.toISOString() : null,
    counts: {
      eligible: doc.counts.eligible,
      excludedNoConsent: doc.counts.excludedNoConsent,
      excludedOptedOut: doc.counts.excludedOptedOut,
    },
    ...tracking,
  };
}

async function loadCampaign(id: string): Promise<CampaignDoc> {
  const doc = await Campaign.findById(id).lean();
  if (!doc) throw errors.notFound('Campaign');
  return doc as CampaignDoc;
}

export async function createCampaign(input: CampaignCreateInput, createdBy: string): Promise<AdminCampaign> {
  const doc = await Campaign.create({
    name: input.name,
    language: input.language,
    message: input.message,
    city: input.city ?? null,
    status: 'draft',
    createdBy,
  });
  return toAdminCampaign(doc.toObject() as CampaignDoc);
}

export async function updateCampaign(id: string, input: CampaignUpdateInput): Promise<AdminCampaign> {
  const doc = await Campaign.findById(id);
  if (!doc) throw errors.notFound('Campaign');
  if (doc.status !== 'draft') {
    throw errors.conflict('CAMPAIGN_NOT_DRAFT', 'A prepared campaign cannot be edited. Create a new campaign instead.');
  }
  if (input.name !== undefined) doc.name = input.name;
  if (input.language !== undefined) doc.language = input.language;
  if (input.message !== undefined) doc.message = input.message;
  if (input.city !== undefined) doc.city = input.city ?? null;
  await doc.save();
  return toAdminCampaign(doc.toObject() as CampaignDoc);
}

export async function getCampaign(id: string): Promise<AdminCampaign> {
  return toAdminCampaign(await loadCampaign(id));
}

export async function listCampaigns(query: CampaignListQuery) {
  const filter: QueryFilter<CampaignAttrs> = {};
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.pageSize;
  const [docs, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(query.pageSize).lean(),
    Campaign.countDocuments(filter),
  ]);
  const items = await Promise.all(docs.map((d) => toAdminCampaign(d as CampaignDoc)));
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Snapshots the audience. Opted-out customers are counted first, so they are never
 * reported as "no consent". Only eligible customers get recipient rows.
 * The campaign moves to "prepared" only after the recipients are written.
 */
export async function prepareCampaign(id: string): Promise<AdminCampaign> {
  const campaign = await loadCampaign(id);
  if (campaign.status !== 'draft') {
    throw errors.conflict('CAMPAIGN_NOT_DRAFT', 'This campaign has already been prepared');
  }

  const filter: QueryFilter<CustomerAttrs> = campaign.city ? { city: campaign.city } : {};
  const customers = await Customer.find(filter).select('name phone consent optedOutAt').lean();

  let excludedOptedOut = 0;
  let excludedNoConsent = 0;
  const recipients: Array<Pick<CampaignRecipientAttrs, 'campaign' | 'customer' | 'customerName' | 'phone'>> = [];
  for (const customer of customers) {
    if (customer.optedOutAt) excludedOptedOut += 1;
    else if (!customer.consent?.marketing) excludedNoConsent += 1;
    else {
      recipients.push({
        campaign: campaign._id,
        customer: customer._id,
        customerName: customer.name,
        phone: customer.phone,
      });
    }
  }

  try {
    if (recipients.length > 0) await CampaignRecipient.insertMany(recipients, { ordered: false });
  } catch (err) {
    // A retry after a partial write may hit the unique index. Only duplicate-key errors are ignored.
    const writeErrors = (err as { writeErrors?: Array<{ code: number }> }).writeErrors;
    if (!writeErrors || !writeErrors.every((w) => w.code === 11000)) throw err;
  }

  const counts = { eligible: recipients.length, excludedNoConsent, excludedOptedOut };
  const updated = await Campaign.findOneAndUpdate(
    { _id: campaign._id, status: 'draft' },
    { $set: { status: 'prepared', preparedAt: new Date(), counts } },
    { returnDocument: 'after' },
  ).lean();
  if (!updated) throw errors.conflict('CAMPAIGN_NOT_DRAFT', 'This campaign has already been prepared');
  return toAdminCampaign(updated as CampaignDoc);
}

async function loadPreparedRecipient(campaignId: string, recipientId: string) {
  const campaign = await loadCampaign(campaignId);
  if (campaign.status !== 'prepared') {
    throw errors.conflict('CAMPAIGN_NOT_PREPARED', 'Prepare the campaign before working with its recipients');
  }
  const recipient = await CampaignRecipient.findOne({ _id: recipientId, campaign: campaign._id }).lean();
  if (!recipient) throw errors.notFound('Recipient');
  return { campaign, recipient };
}

/**
 * Builds the manual click-to-chat link. Eligibility is checked again here, because a customer
 * may have opted out after the campaign was prepared. Nothing is recorded server-side.
 */
export async function buildRecipientLink(campaignId: string, recipientId: string): Promise<RecipientLink> {
  const { campaign, recipient } = await loadPreparedRecipient(campaignId, recipientId);
  const customer = await Customer.findById(recipient.customer).lean();
  if (!customer || !isEligible(customer)) throw errors.conflict('CUSTOMER_NOT_ELIGIBLE', NOT_ELIGIBLE_MESSAGE);
  const text = renderCampaignMessage(campaign.message, customer.name);
  return { url: whatsappProvider.createMessageLink({ phoneE164: recipient.phone, text }) };
}

/** Records the first time staff opened the link. Repeat clicks keep the first timestamp. */
export async function markLinkOpened(campaignId: string, recipientId: string): Promise<AdminCampaignRecipient> {
  await loadPreparedRecipient(campaignId, recipientId);
  await CampaignRecipient.updateOne(
    { _id: recipientId, campaign: campaignId, linkOpenedAt: null },
    { $set: { linkOpenedAt: new Date() } },
  );
  return getRecipient(campaignId, recipientId);
}

/**
 * Staff confirms they sent the message by hand. Blocked for customers who are no longer
 * eligible, because a send after opt-out must not be recorded as a normal send.
 */
export async function markSentConfirmed(
  campaignId: string,
  recipientId: string,
  actorName: string,
): Promise<AdminCampaignRecipient> {
  const { recipient } = await loadPreparedRecipient(campaignId, recipientId);
  const customer = await Customer.findById(recipient.customer).lean();
  if (!customer || !isEligible(customer)) throw errors.conflict('CUSTOMER_NOT_ELIGIBLE', NOT_ELIGIBLE_MESSAGE);
  await CampaignRecipient.updateOne(
    { _id: recipientId, campaign: campaignId, sentConfirmedAt: null },
    { $set: { sentConfirmedAt: new Date(), sentConfirmedBy: actorName } },
  );
  return getRecipient(campaignId, recipientId);
}

async function getRecipient(campaignId: string, recipientId: string): Promise<AdminCampaignRecipient> {
  const recipient = await CampaignRecipient.findOne({ _id: recipientId, campaign: campaignId }).lean();
  if (!recipient) throw errors.notFound('Recipient');
  const customer = await Customer.findById(recipient.customer).select('consent optedOutAt').lean();
  return toRecipient(recipient, customer);
}

function toRecipient(
  r: CampaignRecipientAttrs & { _id: Types.ObjectId },
  customer: Pick<CustomerAttrs, 'consent' | 'optedOutAt'> | null,
): AdminCampaignRecipient {
  return {
    id: String(r._id),
    customerName: r.customerName,
    phoneMasked: maskPhone(r.phone),
    eligible: customer ? isEligible(customer) : false,
    linkOpenedAt: r.linkOpenedAt ? r.linkOpenedAt.toISOString() : null,
    sentConfirmedAt: r.sentConfirmedAt ? r.sentConfirmedAt.toISOString() : null,
  };
}

export async function listRecipients(campaignId: string, page: number, pageSize: number) {
  await loadCampaign(campaignId);
  const filter = { campaign: campaignId };
  const skip = (page - 1) * pageSize;
  const [docs, total] = await Promise.all([
    CampaignRecipient.find(filter).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(pageSize).lean(),
    CampaignRecipient.countDocuments(filter),
  ]);
  const customers = await Customer.find({ _id: { $in: docs.map((d) => d.customer) } })
    .select('consent optedOutAt')
    .lean();
  const byId = new Map(customers.map((c) => [String(c._id), c]));
  return {
    items: docs.map((d) => toRecipient(d, byId.get(String(d.customer)) ?? null)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}


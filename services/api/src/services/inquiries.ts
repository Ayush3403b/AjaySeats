import type { QueryFilter, Types } from 'mongoose';
import {
  maskPhone,
  normalizePhone,
  type AdminInquiryDetail,
  type AdminInquiryListItem,
  type InquiryCreateInput,
  type InquiryListQuery,
  type InquiryReceipt,
  type InquiryStatusInput,
  type LocalizedText,
} from '@pcs/shared';
import { Inquiry, type InquiryAttrs } from '../models/Inquiry.js';
import { Product } from '../models/Product.js';
import { Counter } from '../models/Counter.js';
import { AppError, errors } from '../lib/errors.js';
import { escapeRegex } from '../lib/crypto.js';
import { indiaYear } from '../lib/time.js';
import { whatsappProvider } from '../whatsapp/provider.js';
import { recordInquiryContact } from './customers.js';
import { inquiryFollowUpMessage } from '../whatsapp/templates.js';

/** Forms submitted faster than this are treated as bots. */
export const MIN_FORM_FILL_MS = 3_000;
/** Forms older than this are stale and rejected. */
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

export async function nextReference(now: Date = new Date()): Promise<string> {
  const year = indiaYear(now);
  const counter = await Counter.findOneAndUpdate(
    { _id: `inquiry-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  const seq = counter?.seq ?? 1;
  return `INQ-${year}-${String(seq).padStart(6, '0')}`;
}

export async function createInquiry(input: InquiryCreateInput, now: Date = new Date()): Promise<InquiryReceipt> {
  const age = now.getTime() - input.formStartedAt;
  if (age < MIN_FORM_FILL_MS || age > MAX_FORM_AGE_MS) {
    throw new AppError(400, 'SUBMISSION_REJECTED', 'This form could not be accepted. Please try again.');
  }

  const phone = normalizePhone(input.countryCode, input.mobile);
  if (!phone) {
    throw errors.invalid('Please check the highlighted fields', [{ path: 'mobile', message: 'Enter a valid mobile number' }]);
  }

  const productIds = input.items.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw errors.invalid('Each product can be listed only once', [{ path: 'items', message: 'Duplicate product' }]);
  }

  const products = await Product.find({ _id: { $in: productIds }, published: true, archived: false }).lean();
  if (products.length !== productIds.length) {
    throw errors.invalid('Some selected products are no longer available', [
      { path: 'items', message: 'Remove unavailable products and try again' },
    ]);
  }
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: InquiryAttrs['items'] = input.items.map((line) => {
    const product = byId.get(line.productId)!;
    return {
      product: product._id,
      sku: product.sku,
      name: { en: product.name.en, hi: product.name.hi ?? '' },
      quantity: line.quantity,
      // Price snapshot at submission time. Later price edits never rewrite past inquiries.
      unitPriceMinorSnapshot: product.priceMinor,
      salePriceMinorSnapshot: product.salePriceMinor ?? null,
    };
  });

  const reference = await nextReference(now);
  await Inquiry.create({
    reference,
    customerName: input.name,
    phone,
    language: input.language,
    city: input.city,
    vehicle: input.vehicle,
    items,
    material: input.material ?? null,
    colour: input.colour ? input.colour.toLowerCase() : null,
    message: input.message,
    source: 'website',
    status: 'new',
    statusHistory: [{ status: 'new', at: now }],
    notes: [],
    consent: { marketing: input.consentMarketing, at: now, source: 'quote_form' },
  });
  await recordInquiryContact({
    phone,
    name: input.name,
    city: input.city,
    language: input.language,
    marketing: input.consentMarketing,
    at: now,
    source: 'quote_form',
  });

  return { reference, submittedAt: now.toISOString(), language: input.language };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Dates are interpreted in India time (UTC+05:30) so "today" matches the owner's calendar. */
function istDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+05:30`);
}

export async function listInquiries(query: InquiryListQuery) {
  const filter: QueryFilter<InquiryAttrs> = {};
  if (query.status) filter.status = query.status;
  if (query.productId) filter['items.product'] = query.productId;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: istDayStart(query.from) } : {}),
      ...(query.to ? { $lt: new Date(istDayStart(query.to).getTime() + DAY_MS) } : {}),
    };
  }
  if (query.q) {
    const term = query.q.trim();
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    const or: QueryFilter<InquiryAttrs>[] = [{ reference: rx }, { customerName: rx }];
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 4) or.push({ phone: { $regex: escapeRegex(digits) } });
    filter.$or = or;
  }

  const skip = (query.page - 1) * query.pageSize;
  const [docs, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(query.pageSize).lean(),
    Inquiry.countDocuments(filter),
  ]);
  return {
    items: docs.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function toListItem(doc: InquiryAttrs & { _id: Types.ObjectId }): AdminInquiryListItem {
  return {
    id: String(doc._id),
    reference: doc.reference,
    customerName: doc.customerName,
    phoneMasked: maskPhone(doc.phone),
    city: doc.city,
    status: doc.status,
    itemCount: doc.items.length,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

function toLocalized(t: { en: string; hi?: string | null }): LocalizedText {
  return { en: t.en, hi: t.hi ?? '' };
}

export async function getInquiry(id: string): Promise<AdminInquiryDetail> {
  const doc = await Inquiry.findById(id).lean();
  if (!doc) throw errors.notFound('Inquiry');
  return {
    ...toListItem(doc),
    phone: doc.phone,
    language: doc.language,
    vehicle: doc.vehicle,
    material: doc.material,
    colour: doc.colour,
    message: doc.message,
    items: doc.items.map((i) => ({
      productId: String(i.product),
      sku: i.sku,
      name: toLocalized(i.name),
      quantity: i.quantity,
      unitPriceMinorSnapshot: i.unitPriceMinorSnapshot,
      salePriceMinorSnapshot: i.salePriceMinorSnapshot ?? null,
    })),
    statusHistory: doc.statusHistory.map((h) => ({
      status: h.status,
      at: new Date(h.at).toISOString(),
      ...(h.note ? { note: h.note } : {}),
    })),
    notes: doc.notes.map((n) => ({ text: n.text, at: new Date(n.at).toISOString(), by: n.by })),
    consentMarketing: doc.consent.marketing,
  };
}

export async function updateInquiryStatus(id: string, input: InquiryStatusInput): Promise<AdminInquiryDetail> {
  const doc = await Inquiry.findById(id);
  if (!doc) throw errors.notFound('Inquiry');
  if (doc.status !== input.status) {
    doc.status = input.status;
    doc.statusHistory.push({ status: input.status, at: new Date(), ...(input.note ? { note: input.note } : {}) });
    doc.markModified('statusHistory');
    await doc.save();
  }
  return getInquiry(id);
}

export async function appendInquiryNote(id: string, text: string, actor: string) {
  const doc = await Inquiry.findById(id);
  if (!doc) throw errors.notFound('Inquiry');
  doc.notes.push({ text, at: new Date(), by: actor });
  await doc.save();
  return (await getInquiry(id)).notes;
}

/** Builds a manual click-to-chat link. Generating a link does NOT mark anything as sent. */
export async function buildFollowUpLink(id: string): Promise<{ url: string; language: 'en' | 'hi' }> {
  const doc = await Inquiry.findById(id).lean();
  if (!doc) throw errors.notFound('Inquiry');
  const text = inquiryFollowUpMessage({
    language: doc.language,
    customerName: doc.customerName,
    reference: doc.reference,
    productNames: doc.items.map((i) => (doc.language === 'hi' && i.name.hi ? i.name.hi : i.name.en)),
  });
  return { url: whatsappProvider.createMessageLink({ phoneE164: doc.phone, text }), language: doc.language };
}

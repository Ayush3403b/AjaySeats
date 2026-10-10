import type { QueryFilter, Types } from 'mongoose';
import {
  maskPhone,
  type AdminCustomer,
  type AdminCustomerDetail,
  type CustomerListQuery,
  type CustomerOptOutInput,
  type Language,
} from '@pcs/shared';
import { Customer, type CustomerAttrs } from '../models/Customer.js';
import { Inquiry } from '../models/Inquiry.js';
import { errors } from '../lib/errors.js';
import { escapeRegex } from '../lib/crypto.js';

type CustomerLike = {
  consent: { marketing: boolean };
  optedOutAt?: Date | null;
};

/** Marketing is allowed only with consent and no staff opt-out. Used by campaigns and link creation. */
export function isEligible(customer: CustomerLike): boolean {
  return customer.consent.marketing === true && !customer.optedOutAt;
}

/**
 * Called after each quote request is saved. The latest answer sets consent. Opt-out is not
 * touched here, so a new inquiry can never undo a staff opt-out.
 */
export async function recordInquiryContact(input: {
  phone: string;
  name: string;
  city: string;
  language: Language;
  marketing: boolean;
  at: Date;
  source: string;
}): Promise<void> {
  await Customer.updateOne(
    { phone: input.phone },
    {
      $set: {
        name: input.name,
        city: input.city,
        language: input.language,
        'consent.marketing': input.marketing,
        'consent.at': input.marketing ? input.at : null,
        'consent.source': input.source,
        lastInquiryAt: input.at,
      },
      $inc: { inquiryCount: 1 },
    },
    { upsert: true },
  );
}

/**
 * Rebuilds customer rows from existing inquiries. Safe to run repeatedly: counts and consent are
 * recomputed from inquiries, and staff opt-out fields are never written.
 */
export async function syncCustomersFromInquiries(): Promise<{ customers: number }> {
  const groups = await Inquiry.aggregate<{
    _id: string;
    count: number;
    lastAt: Date;
    last: { name: string; city: string; language: Language; marketing: boolean; at: Date; source: string };
  }>([
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: '$phone',
        count: { $sum: 1 },
        lastAt: { $max: '$createdAt' },
        last: {
          $last: {
            name: '$customerName',
            city: '$city',
            language: '$language',
            marketing: '$consent.marketing',
            at: '$consent.at',
            source: '$consent.source',
          },
        },
      },
    },
  ]);

  if (groups.length === 0) return { customers: 0 };
  await Customer.bulkWrite(
    groups.map((g) => ({
      updateOne: {
        filter: { phone: g._id },
        upsert: true,
        update: {
          $set: {
            name: g.last.name,
            city: g.last.city ?? '',
            language: g.last.language,
            'consent.marketing': g.last.marketing === true,
            'consent.at': g.last.marketing === true ? (g.last.at ?? g.lastAt) : null,
            'consent.source': g.last.source ?? '',
            lastInquiryAt: g.lastAt,
            inquiryCount: g.count,
          },
        },
      },
    })),
    { ordered: false },
  );
  return { customers: groups.length };
}

export function toAdminCustomer(doc: CustomerAttrs & { _id: Types.ObjectId }): AdminCustomer {
  return {
    id: String(doc._id),
    name: doc.name,
    phoneMasked: maskPhone(doc.phone),
    city: doc.city ?? '',
    language: doc.language,
    consentMarketing: doc.consent.marketing,
    consentAt: doc.consent.at ? doc.consent.at.toISOString() : null,
    optedOut: Boolean(doc.optedOutAt),
    optedOutAt: doc.optedOutAt ? doc.optedOutAt.toISOString() : null,
    inquiryCount: doc.inquiryCount,
    lastInquiryAt: doc.lastInquiryAt ? doc.lastInquiryAt.toISOString() : null,
    eligible: isEligible(doc),
  };
}

export async function listCustomers(query: CustomerListQuery) {
  const filter: QueryFilter<CustomerAttrs> = {};
  // The three groups are mutually exclusive: opted-out wins, then missing consent.
  if (query.eligibility === 'eligible') Object.assign(filter, { 'consent.marketing': true, optedOutAt: null });
  if (query.eligibility === 'no_consent') Object.assign(filter, { 'consent.marketing': { $ne: true }, optedOutAt: null });
  if (query.eligibility === 'opted_out') filter.optedOutAt = { $ne: null };
  if (query.q) {
    const term = query.q.trim();
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    const or: QueryFilter<CustomerAttrs>[] = [{ name: rx }];
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 4) or.push({ phone: { $regex: escapeRegex(digits) } });
    filter.$or = or;
  }

  const skip = (query.page - 1) * query.pageSize;
  const [docs, total] = await Promise.all([
    Customer.find(filter).sort({ lastInquiryAt: -1, _id: -1 }).skip(skip).limit(query.pageSize).lean(),
    Customer.countDocuments(filter),
  ]);
  return {
    items: docs.map(toAdminCustomer),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getCustomer(id: string): Promise<AdminCustomerDetail> {
  const doc = await Customer.findById(id).lean();
  if (!doc) throw errors.notFound('Customer');
  const inquiries = await Inquiry.find({ phone: doc.phone })
    .select('reference status createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return {
    ...toAdminCustomer(doc),
    phone: doc.phone,
    optedOutNote: doc.optedOutNote ?? '',
    inquiries: inquiries.map((i) => ({
      reference: i.reference,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

/** Opting out is always allowed. Opting back in is an owner-only action, enforced in the route. */
export async function setCustomerOptOut(id: string, input: CustomerOptOutInput): Promise<AdminCustomer> {
  const doc = await Customer.findById(id);
  if (!doc) throw errors.notFound('Customer');
  doc.optedOutAt = input.optedOut ? (doc.optedOutAt ?? new Date()) : null;
  doc.optedOutNote = input.optedOut ? (input.note ?? doc.optedOutNote ?? '') : '';
  await doc.save();
  return toAdminCustomer(doc.toObject());
}

// Language-independent enums. Labels are localized in the UI via i18n keys;
// the only human-readable strings here are bilingual material names used in
// API responses and the admin, so they never depend on request language.

export const LANGUAGES = ['en', 'hi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const MATERIALS = ['leather', 'leatherette', 'pvc', 'fabric', 'other'] as const;
export type Material = (typeof MATERIALS)[number];

/** Material colour coding (see apps/web/src/styles/theme.css). Gold / violet / aqua / lime / orange. */
export const MATERIAL_META: Record<Material, { label: { en: string; hi: string }; token: string }> = {
  leather: { label: { en: 'Leather', hi: 'लेदर' }, token: '--material-leather' },
  leatherette: { label: { en: 'Leatherette', hi: 'लेदरेट' }, token: '--material-leatherette' },
  pvc: { label: { en: 'PVC', hi: 'पीवीसी' }, token: '--material-pvc' },
  fabric: { label: { en: 'Fabric', hi: 'फैब्रिक' }, token: '--material-fabric' },
  other: { label: { en: 'Other', hi: 'अन्य' }, token: '--material-other' },
};

export const AVAILABILITY = ['in_stock', 'made_to_order', 'unavailable'] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const INQUIRY_STATUSES = [
  'new',
  'contacted',
  'quotation_sent',
  'confirmed',
  'closed',
  'spam',
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const CAMPAIGN_STATUSES = ['draft', 'prepared'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CUSTOMER_ELIGIBILITY = ['eligible', 'no_consent', 'opted_out'] as const;
export type CustomerEligibility = (typeof CUSTOMER_ELIGIBILITY)[number];

export const SORT_OPTIONS = ['latest', 'price_asc', 'price_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const CURRENCY = 'INR' as const;

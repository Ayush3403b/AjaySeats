import type { Language } from '@pcs/shared';

export interface FollowUpContext {
  language: Language;
  customerName: string;
  reference: string;
  productNames: string[];
}

/**
 * Localized follow-up text. Deliberately says "request" and "quotation", never "order" or "confirmed".
 * Product names are passed as data and URL-encoded by the link builder.
 */
export function inquiryFollowUpMessage(ctx: FollowUpContext): string {
  const products = ctx.productNames.length ? ctx.productNames.join(', ') : '';
  if (ctx.language === 'hi') {
    const productPart = products ? ` (${products})` : '';
    return `नमस्ते ${ctx.customerName}, यह प्रीमियम सीट कवर्स की ओर से आपके अनुरोध ${ctx.reference}${productPart} के संबंध में है। कृपया अपना पसंदीदा रंग और कार का विवरण पुष्टि करें। धन्यवाद।`;
  }
  const productPart = products ? ` (${products})` : '';
  return `Hello ${ctx.customerName}, this is Premium Seat Covers regarding your quote request ${ctx.reference}${productPart}. Please confirm your preferred colour and vehicle details. Thank you.`;
}

import { formatInr, type LocalizedText, type PublicProduct } from '@pcs/shared';
import type { UiLanguage } from '../i18n/index.js';

/** Picks the Hindi text when present, otherwise falls back to English. */
export function localized(text: LocalizedText | undefined, lang: UiLanguage): string {
  if (!text) return '';
  return lang === 'hi' && text.hi ? text.hi : text.en;
}

export function price(paise: number, lang: UiLanguage): string {
  return formatInr(paise, lang);
}

/** Effective price is the sale price when one exists; the regular price is shown struck through. */
export function priceSummary(product: Pick<PublicProduct, 'priceMinor' | 'salePriceMinor'>, lang: UiLanguage) {
  const onSale = product.salePriceMinor !== null && product.salePriceMinor < product.priceMinor;
  return {
    onSale,
    current: price(onSale ? (product.salePriceMinor as number) : product.priceMinor, lang),
    regular: onSale ? price(product.priceMinor, lang) : null,
  };
}

/** Schema.org price is a decimal rupee amount, derived from integer paise. */
export function schemaPrice(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Current UI language as a typed value, for localized helpers. */
export function currentLang(i18n: { language: string }): UiLanguage {
  return i18n.language === 'hi' ? 'hi' : 'en';
}

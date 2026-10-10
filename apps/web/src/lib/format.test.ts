import { describe, expect, it } from 'vitest';
import { localized, priceSummary, schemaPrice } from './format.js';
import { buildWhatsAppUrl } from './whatsapp.js';

describe('localized', () => {
  it('returns the Hindi text when present and English otherwise', () => {
    expect(localized({ en: 'Leather', hi: 'चमड़ा' }, 'hi')).toBe('चमड़ा');
    expect(localized({ en: 'Leather', hi: '' }, 'hi')).toBe('Leather');
    expect(localized({ en: 'Leather', hi: 'चमड़ा' }, 'en')).toBe('Leather');
    expect(localized(undefined, 'en')).toBe('');
  });
});

describe('priceSummary', () => {
  it('shows the sale price with the regular price struck through only when the sale is lower', () => {
    const sale = priceSummary({ priceMinor: 500000, salePriceMinor: 420000 }, 'en');
    expect(sale.onSale).toBe(true);
    expect(sale.regular).not.toBeNull();
    expect(sale.current).not.toBe(sale.regular);
  });

  it('ignores a sale price that is not lower than the regular price', () => {
    const same = priceSummary({ priceMinor: 500000, salePriceMinor: 500000 }, 'en');
    expect(same.onSale).toBe(false);
    expect(same.regular).toBeNull();
    const none = priceSummary({ priceMinor: 500000, salePriceMinor: null }, 'en');
    expect(none.onSale).toBe(false);
  });
});

describe('schemaPrice', () => {
  it('converts integer paise to a decimal rupee string', () => {
    expect(schemaPrice(420050)).toBe('4200.50');
    expect(schemaPrice(0)).toBe('0.00');
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds a click-to-chat link with an encoded message', () => {
    const url = buildWhatsAppUrl('919876543210', 'Hi & hello');
    expect(url).toBe('https://wa.me/919876543210?text=Hi%20%26%20hello');
  });

  it('refuses numbers that are not digits-only with 8 to 15 digits', () => {
    expect(buildWhatsAppUrl(null, 'x')).toBeNull();
    expect(buildWhatsAppUrl('', 'x')).toBeNull();
    expect(buildWhatsAppUrl('+91 98765', 'x')).toBeNull();
    expect(buildWhatsAppUrl('123', 'x')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { emptyProductForm, isRupeeAmount, paiseToRupees, rupeesToPaise, serverPathToField, toPayload } from './productForm.js';

describe('rupee and paise conversion', () => {
  it('converts rupee strings to integer paise without float drift', () => {
    expect(rupeesToPaise('4499')).toBe(449900);
    expect(rupeesToPaise('1234.5')).toBe(123450);
    expect(rupeesToPaise('0.1')).toBe(10);
    expect(rupeesToPaise('19.99')).toBe(1999);
    expect(rupeesToPaise('0.29')).toBe(29);
  });

  it('formats paise back to rupee text', () => {
    expect(paiseToRupees(449900)).toBe('4499');
    expect(paiseToRupees(123450)).toBe('1234.50');
    expect(paiseToRupees(123405)).toBe('1234.05');
  });

  it('accepts at most two decimals and rejects everything else', () => {
    expect(isRupeeAmount('1299')).toBe(true);
    expect(isRupeeAmount('1299.50')).toBe(true);
    expect(isRupeeAmount('12.345')).toBe(false);
    expect(isRupeeAmount('-5')).toBe(false);
    expect(isRupeeAmount('abc')).toBe(false);
    expect(isRupeeAmount('')).toBe(false);
  });
});

describe('server validation path mapping', () => {
  it('maps API paths to form fields', () => {
    expect(serverPathToField('priceMinor')).toBe('priceRupees');
    expect(serverPathToField('salePriceMinor')).toBe('salePriceRupees');
    expect(serverPathToField('compatibleVehicles')).toBe('vehicles');
    expect(serverPathToField('compatibleVehicles.2.yearTo')).toBe('vehicles.2.yearTo');
    expect(serverPathToField('name.hi')).toBe('name.hi');
    expect(serverPathToField('slug')).toBe('slug');
  });

  it('returns null for paths the form does not show', () => {
    expect(serverPathToField('somethingElse')).toBeNull();
    expect(serverPathToField('')).toBeNull();
  });
});

describe('toPayload', () => {
  it('sends integer paise, uppercase SKU, and omits the year-to when blank', () => {
    const values = {
      ...emptyProductForm(),
      slug: 'leather-covers',
      sku: ' dem-l-01 ',
      categoryId: 'cat-1',
      name: { en: ' Leather covers ', hi: 'लेदर' },
      priceRupees: '4499.50',
      salePriceRupees: '',
      vehicles: [{ make: 'Maruti', model: 'Swift', yearFrom: '2018', yearTo: '' }],
    };
    const payload = toPayload(values);
    expect(payload.priceMinor).toBe(449950);
    expect(payload.salePriceMinor).toBeNull();
    expect(payload.sku).toBe('DEM-L-01');
    expect(payload.name.en).toBe('Leather covers');
    expect(payload.compatibleVehicles?.[0]).toEqual({ make: 'Maruti', model: 'Swift', yearFrom: 2018 });
    expect(Number.isInteger(payload.priceMinor)).toBe(true);
  });
});

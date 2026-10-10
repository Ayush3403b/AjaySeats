import { describe, expect, it } from 'vitest';
import { emptyProductForm, productFormSchema, serverPathToField, toPayload, toFormValues } from './productForm.js';

const image = (name: string) => ({
  url: `https://res.cloudinary.com/demo/image/upload/v1/${name}.jpg`,
  publicId: `premium-seat-covers/products/${name}`,
  alt: { en: `${name} alt`, hi: '' },
});

function validForm(images: ReturnType<typeof image>[]) {
  return {
    ...emptyProductForm(),
    slug: 'leather-full-set',
    sku: 'LFS-001',
    categoryId: '507f1f77bcf86cd799439011',
    name: { en: 'Leather full set', hi: 'लेदर फुल सेट' },
    description: { en: 'Full set leather covers.', hi: '' },
    seo: { title: { en: 'Leather full set', hi: '' }, description: { en: 'Leather covers.', hi: '' } },
    priceRupees: '4999',
    images,
  };
}

describe('product images in the form', () => {
  it('sends images in editor order, with order taken from the position', () => {
    const payload = toPayload(validForm([image('front'), image('side')]));
    expect(payload.images?.map((i) => [i.publicId, i.order])).toEqual([
      ['premium-seat-covers/products/front', 0],
      ['premium-seat-covers/products/side', 1],
    ]);
  });

  it('requires English alt text, and only accepts images from the image host', () => {
    const noAlt = validForm([{ ...image('front'), alt: { en: '  ', hi: '' } }]);
    expect(productFormSchema.safeParse(noAlt).success).toBe(false);
    const foreign = validForm([{ ...image('front'), url: 'https://example.com/front.jpg' }]);
    expect(productFormSchema.safeParse(foreign).success).toBe(false);
    expect(productFormSchema.safeParse(validForm([image('front')])).success).toBe(true);
  });

  it('round-trips stored images back into the form sorted by order', () => {
    const values = toFormValues({
      slug: 'leather-full-set',
      sku: 'LFS-001',
      category: { id: '507f1f77bcf86cd799439011', slug: 'full-set', name: { en: 'Full set', hi: '' } },
      material: 'leather',
      name: { en: 'Leather full set', hi: '' },
      description: { en: 'Full set leather covers.', hi: '' },
      priceMinor: 499900,
      salePriceMinor: null,
      availability: 'in_stock',
      featured: false,
      published: true,
      colours: [],
      compatibleVehicles: [],
      stitching: [],
      seo: { title: { en: 'Leather full set', hi: '' }, description: { en: 'Leather covers.', hi: '' } },
      images: [
        { url: 'https://res.cloudinary.com/demo/b.jpg', publicId: 'premium-seat-covers/products/b', alt: { en: 'B', hi: '' }, order: 1 },
        { url: 'https://res.cloudinary.com/demo/a.jpg', publicId: 'premium-seat-covers/products/a', alt: { en: 'A', hi: 'अ' }, order: 0 },
      ],
    } as unknown as Parameters<typeof toFormValues>[0]);
    expect(values.images.map((i) => i.alt.en)).toEqual(['A', 'B']);
  });

  it('maps image alt errors to their field and reports image URL errors as a general message', () => {
    expect(serverPathToField('images.0.alt.en')).toBe('images.0.alt.en');
    expect(serverPathToField('images')).toBe('images');
    expect(serverPathToField('images.0.url')).toBeNull();
  });
});

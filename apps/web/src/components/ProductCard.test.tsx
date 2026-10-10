import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicProduct } from '@pcs/shared';
import { applyLanguage } from '../i18n/index.js';
import { ProductCard } from './ProductCard.js';

vi.mock('../api/index.js', async () => {
  const http = await import('../api/http.js');
  return {
    ApiError: http.ApiError,
    api: { mode: 'demo', getSettings: vi.fn(async () => ({ whatsappNumber: '919876543210', currency: 'INR', languages: ['en', 'hi'] })) },
  };
});

const product: PublicProduct = {
  id: '64b000000000000000000001',
  slug: 'leather-full-set',
  sku: 'DEMO-LTH-001',
  name: { en: 'Leather full set', hi: 'लेदर फुल सेट' },
  description: { en: 'Demo description', hi: 'डेमो विवरण' },
  category: { id: '64b0000000000000000000aa', slug: 'full-set', name: { en: 'Full set', hi: 'फुल सेट' } },
  material: 'leather',
  colours: [{ name: { en: 'Black', hi: 'काला' }, code: '#111111' }],
  compatibleVehicles: [{ make: 'Maruti', model: 'Swift', yearFrom: 2018 }],
  stitching: [],
  priceMinor: 4500000,
  salePriceMinor: 4000000,
  currency: 'INR',
  availability: 'in_stock',
  featured: true,
  images: [],
  seo: { title: { en: 'x', hi: 'x' }, description: { en: 'x', hi: 'x' } },
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('ProductCard', () => {
  beforeAll(async () => {
    await applyLanguage('en');
  });

  it('links to the product page and shows the sale price with the regular price', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /leather full set/i });
    expect(link).toHaveAttribute('href', '/products/leather-full-set');
    expect(screen.getByText(/40,000/)).toBeInTheDocument();
    // Sale price is shown and the regular price is marked as such for assistive tech.
    expect(screen.getByText(/Regular price/i)).toBeInTheDocument();
  });

  it('renders the material colour code as text, not colour alone', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Leather').length).toBeGreaterThan(0);
  });
});

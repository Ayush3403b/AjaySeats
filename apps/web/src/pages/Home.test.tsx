import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicProduct } from '@pcs/shared';
import en from '../i18n/locales/en.json';
import { applyLanguage } from '../i18n/index.js';
import Home from './Home.js';

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
  salePriceMinor: null,
  currency: 'INR',
  availability: 'made_to_order',
  featured: true,
  images: [],
  seo: { title: { en: 'x', hi: 'x' }, description: { en: 'x', hi: 'x' } },
  updatedAt: '2026-10-01T00:00:00.000Z',
};

vi.mock('../api/index.js', async () => {
  const http = await import('../api/http.js');
  return {
    ApiError: http.ApiError,
    api: {
      mode: 'demo',
      getProducts: vi.fn(async () => ({ items: [product], page: 1, pageSize: 48, total: 1, totalPages: 1 })),
      getCategories: vi.fn(async () => ({
        items: [{ id: 'c1', slug: 'full-set', name: { en: 'Full set', hi: 'फुल सेट' }, description: { en: 'Complete seat sets.', hi: 'पूरे सीट सेट।' }, sortOrder: 1 }],
      })),
      getSettings: vi.fn(async () => ({ whatsappNumber: '919876543210', currency: 'INR', languages: ['en', 'hi'] })),
    },
  };
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  beforeAll(async () => {
    // jsdom has no ResizeObserver; the featured carousel measures itself with one.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    await applyLanguage('en');
  });

  it('renders the new sections', () => {
    renderHome();
    for (const title of [en.home.why.title, en.home.categories.title, en.home.finder.title, en.home.transform.title, en.home.care.title, en.home.faq.title, en.home.seoBlock.title]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('publishes FAQ structured data that matches the questions on the page', () => {
    renderHome();
    const data = JSON.parse(document.getElementById('page-jsonld')?.textContent ?? 'null');
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(en.home.faq.items.length);
    expect(data.mainEntity[0]).toMatchObject({ name: en.home.faq.items[0].q, acceptedAnswer: { text: en.home.faq.items[0].a } });
    expect(screen.getByRole('button', { name: en.home.faq.items[0].q })).toBeInTheDocument();
  });

  it('opens one FAQ answer at a time', () => {
    renderHome();
    const first = screen.getByRole('button', { name: en.home.faq.items[0].q });
    const second = screen.getByRole('button', { name: en.home.faq.items[1].q });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('links categories and popular searches into the filtered catalogue', async () => {
    renderHome();
    const category = await screen.findByRole('link', { name: /Full set/ });
    expect(category).toHaveAttribute('href', '/products?category=full-set');
    const popular = screen.getByRole('navigation', { name: en.home.seoBlock.popular });
    expect(await within(popular).findByRole('link', { name: 'Seat covers for Maruti' })).toHaveAttribute('href', '/products?make=Maruti');
    expect(within(popular).getByRole('link', { name: 'PVC seat covers' })).toHaveAttribute('href', '/products?material=pvc');
  });

  it('suggests a material from the chosen priority', () => {
    renderHome();
    fireEvent.click(screen.getByLabelText(en.home.finder.options.clean));
    expect(screen.getByText(`${en.home.finder.result}: PVC`)).toBeInTheDocument();
  });

  it('moves the before and after slider with the keyboard control', () => {
    renderHome();
    const slider = screen.getByRole('slider', { name: en.home.transform.slider });
    fireEvent.change(slider, { target: { value: '20' } });
    expect(slider).toHaveValue('20');
  });
});

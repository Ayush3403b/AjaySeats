import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicProduct } from '@pcs/shared';
import { applyLanguage } from '../i18n/index.js';
import { QuoteBasketProvider } from '../lib/quoteBasket.js';
import RequestQuote from './RequestQuote.js';

const { fakeApi } = vi.hoisted(() => ({
  fakeApi: {
    mode: 'api' as const,
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    getCategories: vi.fn(),
    getMaterials: vi.fn(),
    getSettings: vi.fn(),
    createInquiry: vi.fn(),
  },
}));

vi.mock('../api/index.js', async () => {
  const http = await import('../api/http.js');
  return { api: fakeApi, ApiError: http.ApiError };
});

const PRODUCT_ID = '64b000000000000000000001';

const product: PublicProduct = {
  id: PRODUCT_ID,
  slug: 'leather-full-set',
  sku: 'DEMO-LTH-001',
  name: { en: 'Leather full set', hi: 'लेदर फुल सेट' },
  description: { en: 'Demo description', hi: 'डेमो विवरण' },
  category: { id: '64b0000000000000000000aa', slug: 'full-set', name: { en: 'Full set', hi: 'फुल सेट' } },
  material: 'leather',
  colours: [],
  compatibleVehicles: [],
  stitching: [],
  priceMinor: 4500000,
  salePriceMinor: null,
  currency: 'INR',
  availability: 'in_stock',
  featured: false,
  images: [],
  seo: { title: { en: 'x', hi: 'x' }, description: { en: 'x', hi: 'x' } },
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function renderPage(path = '/request-quote') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuoteBasketProvider>
        <RequestQuote />
      </QuoteBasketProvider>
    </MemoryRouter>,
  );
}

async function fillCustomerStep() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ravi Kumar' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Patna' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('Car make');
}

async function fillVehicleStep() {
  fireEvent.change(screen.getByLabelText('Car make'), { target: { value: 'Maruti' } });
  fireEvent.change(screen.getByLabelText('Car model'), { target: { value: 'Swift' } });
  fireEvent.change(screen.getByLabelText('Manufacturing year'), { target: { value: '2019' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('Add a product');
}

async function addProductAndReachReview() {
  await waitFor(() => expect(screen.getByRole('option', { name: /Leather full set/ })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Add a product'), { target: { value: PRODUCT_ID } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Check your details');
}

describe('RequestQuote', () => {
  beforeAll(async () => {
    await applyLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fakeApi.getProducts.mockResolvedValue({ items: [product], page: 1, pageSize: 48, total: 1, totalPages: 1 });
    fakeApi.getProduct.mockResolvedValue(product);
    fakeApi.getSettings.mockResolvedValue({ whatsappNumber: '919876543210', currency: 'INR', languages: ['en', 'hi'] });
  });

  it('does not advance past the customer step while required fields are empty', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.queryByLabelText('Car make')).not.toBeInTheDocument();
  });

  it('walks through all four steps and sends the mapped payload', async () => {
    fakeApi.createInquiry.mockResolvedValue({ reference: 'INQ-2026-000123', submittedAt: '2026-10-10T00:00:00.000Z', language: 'en' });
    renderPage();
    await fillCustomerStep();
    await fillVehicleStep();

    // Products step: continuing with no products must show the items error.
    await waitFor(() => expect(fakeApi.getProducts).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Add at least one product')).toBeInTheDocument();

    await addProductAndReachReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send quote request' }));

    await waitFor(() => expect(fakeApi.createInquiry).toHaveBeenCalledTimes(1));
    const payload = fakeApi.createInquiry.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      name: 'Ravi Kumar',
      mobile: '9876543210',
      countryCode: '+91',
      city: 'Patna',
      language: 'en',
      vehicle: { make: 'Maruti', model: 'Swift', year: 2019 },
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
      material: null,
      colour: null,
      consentMarketing: false,
      website: '',
    });
    expect(typeof payload.formStartedAt).toBe('number');

    const reference = await screen.findByText('INQ-2026-000123', { selector: 'span.sr-only' });
    expect(reference).toBeInTheDocument();
  });

  it('maps server validation paths back to the right step and shows a summary', async () => {
    const { ApiError } = await import('../api/http.js');
    fakeApi.createInquiry.mockRejectedValue(
      new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted fields', [{ path: 'vehicle.make', message: 'Enter the car make' }]),
    );
    renderPage();
    await fillCustomerStep();
    await fillVehicleStep();
    await addProductAndReachReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send quote request' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Please check the highlighted fields/)).toBeInTheDocument();
    // The server's vehicle.make error moves the user back to the vehicle step.
    expect(await screen.findByLabelText('Car make')).toBeInTheDocument();
    expect(screen.getByText('Enter the car make')).toBeInTheDocument();
  });
});

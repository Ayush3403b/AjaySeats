import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { applyLanguage } from '../i18n/index.js';
import { DEFAULT_SHARE_IMAGE, Seo, absoluteUrl, fullTitle, languageUrls } from './Seo.js';

const meta = (attr: 'name' | 'property', key: string) => document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
const href = (selector: string) => document.head.querySelector(selector)?.getAttribute('href') ?? null;

describe('Seo helpers', () => {
  it('appends the brand to a title only once', () => {
    expect(fullTitle('About us', 'Premium Seat Covers')).toBe('About us | Premium Seat Covers');
    expect(fullTitle('Premium Seat Covers | Made to order', 'Premium Seat Covers')).toBe('Premium Seat Covers | Made to order');
  });

  it('makes root paths absolute and leaves full URLs alone', () => {
    expect(absoluteUrl('/og-image.png')).toMatch(/^https?:\/\/[^/]+\/og-image\.png$/);
    expect(absoluteUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  it('uses the plain path for English and ?lang=hi for Hindi, with a per-language canonical', () => {
    const en = absoluteUrl('/products');
    expect(languageUrls('/products', 'en')).toEqual({ en, hi: `${en}?lang=hi`, canonical: en });
    expect(languageUrls('/products', 'hi').canonical).toBe(`${en}?lang=hi`);
  });
});

describe('<Seo>', () => {
  beforeEach(async () => {
    await applyLanguage('en');
  });
  afterEach(async () => {
    await applyLanguage('en');
  });

  it('writes the title, social card and language links', () => {
    render(<Seo title="About us" description="How we work." path="/about" />);
    expect(document.title).toBe('About us | Premium Seat Covers');
    expect(meta('name', 'description')).toBe('How we work.');
    expect(meta('property', 'og:title')).toBe('About us | Premium Seat Covers');
    expect(meta('property', 'og:image')).toBe(absoluteUrl(DEFAULT_SHARE_IMAGE));
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'robots')).toContain('index, follow');
    expect(href('link[rel="canonical"]')).toBe(absoluteUrl('/about'));
    expect(href('link[hreflang="hi"]')).toBe(`${absoluteUrl('/about')}?lang=hi`);
    expect(href('link[hreflang="x-default"]')).toBe(absoluteUrl('/about'));
  });

  it('points the canonical at the Hindi URL when Hindi is shown', async () => {
    await applyLanguage('hi');
    render(<Seo title="x" description="y" path="/materials" />);
    expect(href('link[rel="canonical"]')).toBe(`${absoluteUrl('/materials')}?lang=hi`);
    expect(meta('property', 'og:locale')).toBe('hi_IN');
    expect(meta('property', 'og:locale:alternate')).toBe('en_IN');
    expect(document.documentElement.lang).toBe('hi');
  });

  it('removes keywords and the default image size on pages that do not use them', () => {
    const { rerender } = render(<Seo title="Home" description="d" path="/" keywords="seat covers" />);
    expect(meta('name', 'keywords')).toBe('seat covers');
    rerender(<Seo title="Product" description="d" path="/products/x" image="https://cdn.example.com/p.jpg" />);
    expect(meta('name', 'keywords')).toBeNull();
    expect(meta('property', 'og:image')).toBe('https://cdn.example.com/p.jpg');
    expect(meta('property', 'og:image:width')).toBeNull();
  });

  it('accepts several JSON-LD blocks and removes them on unmount', () => {
    const blocks = [{ '@type': 'Product' }, { '@type': 'BreadcrumbList' }];
    const { unmount } = render(<Seo title="x" description="y" path="/" jsonLd={blocks} />);
    const script = document.getElementById('page-jsonld');
    expect(JSON.parse(script?.textContent ?? 'null')).toEqual(blocks);
    unmount();
    expect(document.getElementById('page-jsonld')).toBeNull();
  });
});

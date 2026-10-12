import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLanguage } from '../i18n/index.js';

type JsonLd = Record<string, unknown>;

interface SeoProps {
  title: string;
  description: string;
  /** Path without query, e.g. "/products". */
  path: string;
  jsonLd?: JsonLd | JsonLd[];
  /** Admin and other private screens: asks search engines not to index or follow. */
  noindex?: boolean;
  /** Share image (absolute URL or a root path). Defaults to the 1200×630 site card. */
  image?: string;
  imageAlt?: string;
  /** Comma-separated keywords. The tag is removed on pages that do not set it. */
  keywords?: string;
}

/** The default social card in public/. 1200×630, the size Open Graph and X/Twitter expect. */
export const DEFAULT_SHARE_IMAGE = '/og-image.png';

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '');

function origin(): string {
  return SITE_URL || window.location.origin;
}

export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${origin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Language URLs. English is the plain path (what crawlers get without ?lang), Hindi adds ?lang=hi.
 * The canonical points at the URL of the language being shown, so the two versions are not
 * folded into one, and both list each other as hreflang alternates.
 */
export function languageUrls(path: string, lang: UiLanguage) {
  const en = absoluteUrl(path);
  const hi = `${en}?lang=hi`;
  return { en, hi, canonical: lang === 'hi' ? hi : en };
}

/** Appends the brand unless the title already carries it. */
export function fullTitle(title: string, brand: string): string {
  return title.includes(brand) ? title : `${title} | ${brand}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertLink(selector: string, rel: string, href: string, hreflang?: string) {
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Per-page title, description, canonical, hreflang alternates, Open Graph, X/Twitter card and optional JSON-LD.
 * Every value is localized; JSON-LD must only contain data that is visible on the page.
 */
export function Seo({ title, description, path, jsonLd, noindex = false, image = DEFAULT_SHARE_IMAGE, imageAlt, keywords }: SeoProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;
  const brand = t('app.name');
  const alt = imageAlt ?? t('seo.imageAlt');

  useEffect(() => {
    const urls = languageUrls(path, lang);
    const pageTitle = fullTitle(title, brand);
    const imageUrl = absoluteUrl(image);
    document.title = pageTitle;
    upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    else removeMeta('name', 'keywords');

    upsertMeta('property', 'og:site_name', brand);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', urls.canonical);
    upsertMeta('property', 'og:locale', lang === 'hi' ? 'hi_IN' : 'en_IN');
    upsertMeta('property', 'og:locale:alternate', lang === 'hi' ? 'en_IN' : 'hi_IN');
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', alt);
    // Width and height describe the default card only; other images let the platform measure them.
    if (image === DEFAULT_SHARE_IMAGE) {
      upsertMeta('property', 'og:image:width', '1200');
      upsertMeta('property', 'og:image:height', '630');
    } else {
      removeMeta('property', 'og:image:width');
      removeMeta('property', 'og:image:height');
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', alt);

    upsertLink('link[rel="canonical"]', 'canonical', urls.canonical);
    upsertLink('link[hreflang="en"]', 'alternate', urls.en, 'en');
    upsertLink('link[hreflang="hi"]', 'alternate', urls.hi, 'hi');
    upsertLink('link[hreflang="x-default"]', 'alternate', urls.en, 'x-default');
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    document.documentElement.lang = lang;
  }, [title, description, path, lang, noindex, brand, image, alt, keywords]);

  useEffect(() => {
    const id = 'page-jsonld';
    document.getElementById(id)?.remove();
    if (!jsonLd) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    document.head.appendChild(script);
    return () => script.remove();
  }, [jsonLd]);

  return null;
}

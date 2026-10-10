import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLanguage } from '../i18n/index.js';

interface SeoProps {
  title: string;
  description: string;
  /** Path without query, e.g. "/products". */
  path: string;
  jsonLd?: Record<string, unknown>;
  /** Admin and other private screens: asks search engines not to index or follow. */
  noindex?: boolean;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '');

function origin(): string {
  return SITE_URL || window.location.origin;
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
 * Per-page title, description, canonical, hreflang alternates, Open Graph and optional JSON-LD.
 * Every value is localized; JSON-LD must only contain data that is visible on the page.
 */
export function Seo({ title, description, path, jsonLd, noindex = false }: SeoProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language === 'hi' ? 'hi' : 'en') as UiLanguage;

  useEffect(() => {
    const base = origin();
    const canonical = `${base}${path}`;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:locale', lang === 'hi' ? 'hi_IN' : 'en_IN');
    upsertLink('link[rel="canonical"]', 'canonical', canonical);
    upsertLink('link[hreflang="en"]', 'alternate', `${canonical}?lang=en`, 'en');
    upsertLink('link[hreflang="hi"]', 'alternate', `${canonical}?lang=hi`, 'hi');
    upsertLink('link[hreflang="x-default"]', 'alternate', `${canonical}?lang=en`, 'x-default');
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    document.documentElement.lang = lang;
  }, [title, description, path, lang, noindex]);

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

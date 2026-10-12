import type { Plugin } from 'vite';

/**
 * Public routes listed in the sitemap. Product pages come from the API; to list them too, generate
 * them at build time (see docs/deployment.md). Admin and API paths are never listed.
 */
export const SITEMAP_ROUTES = ['/', '/products', '/materials', '/request-quote', '/about', '/contact', '/privacy', '/terms'];

const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * One <url> per language version. English is the plain path and Hindi adds ?lang=hi, matching the
 * canonical and hreflang tags the Seo component writes at runtime.
 */
export function sitemapXml(siteUrl: string, lastmod: string, routes: readonly string[] = SITEMAP_ROUTES): string {
  const entries = routes.flatMap((path) => {
    const en = `${siteUrl}${path}`;
    const hi = `${en}?lang=hi`;
    const alternates = [
      `    <xhtml:link rel="alternate" hreflang="en" href="${xml(en)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="hi" href="${xml(hi)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(en)}"/>`,
    ].join('\n');
    return [en, hi].map((loc) => `  <url>\n    <loc>${xml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates}\n  </url>`);
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generated at build time by seo.plugin.ts from VITE_SITE_URL. Do not edit by hand. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsTxt(siteUrl: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
}

/**
 * - Replaces %SITE_URL% in index.html, so the static share tags carry absolute URLs (crawlers that do
 *   not run JavaScript, such as WhatsApp and Facebook link previews, only see these).
 * - Emits sitemap.xml and robots.txt into the build, and serves them in dev.
 * Sitemaps must use absolute URLs, so set VITE_SITE_URL for production builds.
 */
export function seoFiles(siteUrl: string | undefined): Plugin {
  const base = (siteUrl ?? '').replace(/\/$/, '');
  const files = (): Record<string, { body: string; type: string }> => ({
    'sitemap.xml': { body: sitemapXml(base, new Date().toISOString().slice(0, 10)), type: 'application/xml; charset=utf-8' },
    'robots.txt': { body: robotsTxt(base), type: 'text/plain; charset=utf-8' },
  });

  return {
    name: 'pcs-seo-files',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', base),
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files()[(req.url ?? '').split('?')[0].replace(/^\//, '')];
        if (!file) return next();
        res.setHeader('Content-Type', file.type);
        res.end(file.body);
      });
    },
    buildStart() {
      if (!/^https?:\/\//.test(base)) {
        this.warn('VITE_SITE_URL is not set to an absolute URL. sitemap.xml, robots.txt and the share tags in index.html will use relative URLs, which search engines and link previews ignore.');
      }
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files())) {
        this.emitFile({ type: 'asset', fileName, source: file.body });
      }
    },
  };
}

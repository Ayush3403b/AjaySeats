/*
 * Premium Seat Covers service worker. Registered only in production builds (see src/main.tsx).
 *
 * What it caches:
 *   - the app shell ("/") and the manifest and icons, so the site opens offline
 *   - hashed build assets under /assets/ (cache-first; file names change on every build)
 *
 * What it never caches:
 *   - /api/* and /admin/* (always the network, so data and admin pages are never stale or stored)
 *   - cross-origin requests and non-GET requests
 *   - responses that are not ok or not same-origin basic responses
 */
const VERSION = 'psc-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isNeverCached(pathname) {
  return pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/admin');
}

function cacheIfCacheable(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url.pathname)) return;

  if (request.mode === 'navigate') {
    // Pages: network first so content is current. Offline, serve the cached shell; the router renders the URL.
    event.respondWith(
      fetch(request)
        .then((response) => (url.pathname === '/' ? cacheIfCacheable(request, response) : response))
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((response) => cacheIfCacheable(request, response)),
      ),
    );
  }
});

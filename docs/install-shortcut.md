# Install as an app shortcut (PWA)

The site ships a web app manifest (`public/manifest.webmanifest`) with 192 px and 512 px icons, so supported browsers offer to install it.

- **Android Chrome / Edge**: menu (three dots), then "Install app" or "Add to Home screen".
- **Desktop Chrome / Edge**: install icon in the address bar.
- **iPhone Safari**: Share, then "Add to Home Screen".

This adds a home-screen shortcut that opens the site.

## Offline behaviour

A service worker (`public/sw.js`) is registered in production builds only. It:

- caches the app shell (`/`), the manifest and the icons, so the home page can open offline. Offline navigation falls back to the cached shell, and the router then renders the URL.
- caches hashed build files under `/assets/` (cache-first; file names change on each build).
- never caches `/api/*` or `/admin/*`, cross-origin requests, or non-GET requests. Product and admin data always come from the network.

Product pages and other routes are not cached, so they need a connection. Changing the cache rules means bumping `VERSION` in `sw.js` so that old caches are cleared on activation.

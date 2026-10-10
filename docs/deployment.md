# Deployment

Status: configuration is written but **not deployed or verified against a live environment**. Test before relying on it.

## API (Render, or any Node host)

- Build: `npm ci && npm run build -w @pcs/shared && npm run build -w @pcs/api`
- Start: `npm run start -w @pcs/api`
- Environment: `NODE_ENV=production`, `PORT` (the host usually sets it), `CLIENT_URL` (web origin, no trailing slash), `MONGODB_URI` (Atlas connection string), `SESSION_SECRET` (at least 32 random characters), `WHATSAPP_NUMBER` (digits only, optional).
- `DEV_INQUIRY_LIMIT_PER_HOUR`: development and test only. Raises the quote-form limit (default 8 per IP per hour) for local end-to-end runs. Ignored in production. Do not set it in production.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: set all three to enable product image uploads. Until then, the signature endpoint returns 501 and products with images are refused. Keep the API secret server-side only.

## Web (Vercel)

- `apps/web/vercel.json` builds `@pcs/web` into `dist` and rewrites unknown paths to `index.html`.
- Environment: `VITE_API_BASE_URL` (use `/api/v1` with the rewrite), `VITE_SITE_URL` (canonical site URL), `VITE_DATA_SOURCE=api`. Never place secrets in `VITE_*` variables; they are public.

### Cross-origin requirement

The Vercel site and the Render API are different origins. Cookie sessions need `SameSite=None; Secure` cookies and an exact `CLIENT_URL` match for CORS. **Status: rewrite added, host not set.** `apps/web/vercel.json` forwards `/api/*` to the API. The destination is a placeholder, `https://REPLACE-WITH-API-HOST/api/:path*`, and must be replaced with the real Render URL before go-live. Until then, production `/api` calls fail.

With the rewrite live, the browser calls the API through the Vercel domain, so requests are same-origin. Set `VITE_API_BASE_URL=/api/v1` (a relative path) for the Vercel build. Still check the session cookie and CORS behaviour end to end after the real host is set. Do not skip this check.

The SPA rewrite in `vercel.json` excludes `/api/`, `/assets/`, the manifest, `robots.txt`, `sitemap.xml`, `sw.js`, `icon-*` and `favicon`, so these are served as static files.

## Checklist before go-live

1. `npm run seed` against a staging database, then change the admin password.
2. Replace all demo products. Demo rows are labelled but still exist in the seed.
3. Confirm the legal text with counsel.
4. Confirm WhatsApp number and click-to-chat links on desktop and mobile.
5. Run `npm run typecheck`, `npm test` and `npm run build` from the repo root.
6. Run `npm run customers:sync` once against the production database, after the first deploy, to backfill customers from existing inquiries.

# Premium Seat Covers

Bilingual (English and Hindi) website for a made-to-order car seat-cover maker, with an API. Monorepo:

- `apps/web`: React, Vite, TypeScript, Tailwind, Framer Motion, React Hook Form with Zod, i18next.
- `services/api`: Node, Express, TypeScript, Mongoose (MongoDB Atlas), Zod, Argon2id, cookie sessions with CSRF.
- `packages/shared`: types and Zod schemas shared by both.
- `docs/`: API, database, i18n, deployment and install notes.

## Requirements

- Node.js 20.19 or newer
- MongoDB (Atlas or local) for the API

## Setup (Windows, macOS, Linux)

```bash
npm install
copy services\api\.env.example services\api\.env     # Windows (use cp on macOS/Linux)
copy apps\web\.env.example apps\web\.env
```

Edit `services/api/.env`: set `MONGODB_URI` and `SESSION_SECRET`.

```bash
npm run seed    # creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD, plus demo data
npm run dev     # starts the API (port 4000) and the web app (port 5173)
```

The web app runs without the API too: when `VITE_API_BASE_URL` is empty, it uses labelled demo data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Builds shared types, then runs API and web. One failing does not stop the other. |
| `npm run build` | Builds shared, API and web. |
| `npm run typecheck` | Type-checks all workspaces. |
| `npm test` | Runs API (Supertest) and web (Vitest) tests. |
| `npm run seed` | Seeds the database. |
| `npm run audit:deps` | Production dependency audit (high severity). |

## Status

Implemented: public catalogue, product detail, materials, about, quote request (four steps, server validation mapping), contact, privacy and terms, 404, EN/HI, dark and light themes, reduced-motion handling, product and inquiry API with admin authentication, and the admin dashboard at `/admin` (login, product list with live price edits, publish, archive and delete, product create and edit, inquiry list and detail with status, notes and WhatsApp link tracking). The admin needs the live API; the demo build shows a notice instead of saving.

Not yet implemented: image uploads, customers, campaigns, WhatsApp message sending (only click-to-chat links), translation admin endpoints, and a contact form endpoint. See `docs/api.md`.

Not verified: a live deployment, and end-to-end operation against MongoDB Atlas. The API has passing Supertest suites; the web app has passing Vitest suites and a browser audit of the public pages at 320, 360, 375, 390, 768 and 1280 px.

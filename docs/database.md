# Database (MongoDB Atlas, Mongoose)

Collections, defined in `services/api/src/models`:

- **users**: admin accounts (`owner`, `staff` roles). Passwords are stored only as Argon2id hashes.
- **sessions**: server-side sessions for cookie auth. Expire automatically.
- **categories**: slug, bilingual name and description, sort order.
- **products**: bilingual name, description, stitching and SEO text; SKU; category; material; colours; compatible vehicles (make, model, year range); `priceMinor` and `salePriceMinor` as integer paise; availability; featured flag; published and archived flags.
- **inquiries**: customer details, vehicle, requested items with snapshotted unit and sale prices, status history, internal notes, marketing consent, and a unique `reference`.
- **counters**: atomic sequence counters used to issue references.
- **customers**: one record per phone number (unique, E.164 format `+91...`). Name, city, language, marketing consent (`consent.marketing`, `consent.at`, `consent.source`), opt-out (`optedOutAt`, `optedOutNote`), and `inquiryCount` and `lastInquiryAt`. Created or updated when a quote request arrives. Indexed on consent, opt-out and city, and on `lastInquiryAt`.
- **campaigns**: a name, language, message (max 600 characters), optional city filter, status (`draft`, then prepared), `preparedAt`, and the audience counts `{ eligible, excludedNoConsent, excludedOptedOut }` fixed at preparation.
- **campaignrecipients**: one row per customer per campaign (unique on `campaign` + `customer`). Holds the customer's name and phone at preparation time, `linkOpenedAt`, `sentConfirmedAt` and `sentConfirmedBy`. The first timestamp of each event is kept.

Collection names in the dev database, as listed by MongoDB: `campaignrecipients`, `campaigns`, `categories`, `counters`, `customers`, `inquiries`, `products`, `sessions`, `users`.

## Conventions

- **Money** is stored as integer paise (`priceMinor = 420000` means Rs 4,200.00). Display formatting happens in the client with `Intl`.
- **References** look like `INQ-2026-000123`. The number comes from `counters` with an atomic increment, and the reference field has a unique index.
- **Drafts and archived products** are excluded from public queries in the service layer (`published: true, archived: false`), not only in the UI.
- **Phone numbers** are masked in list responses, for both inquiries and customers.

Customer backfill (`npm run customers:sync` from the repo root, or `npm run customers:sync -w @pcs/api`) builds customer records from existing inquiries. It upserts by phone number, so running it again does not duplicate customers. It prints the number of inquiries it synced.

Seed data (`npm run seed`) creates one admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` and demo catalogue rows. Demo rows are labelled as demo in their text. Do not use the seed admin credentials in production.

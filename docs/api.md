# REST API (`services/api`)

Base path: `/api/v1`. All bodies are JSON (32 KB limit). Errors use one envelope:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Please check the highlighted fields", "details": [{ "path": "vehicle.make", "message": "Enter the car make" }], "requestId": "..." } }
```

Codes the web app translates: `NETWORK`, `VALIDATION_FAILED` (422), `RATE_LIMITED` (429), `SUBMISSION_REJECTED`, `NOT_FOUND`, `INTERNAL`.

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness check. |
| GET | `/products` | Query: `q`, `category`, `material`, `colour` (hex), `make`, `model`, `minPrice`, `maxPrice` (paise), `featured`, `sort` (`latest`, `price_asc`, `price_desc`), `page`, `pageSize` (max 48). Returns `Paginated<PublicProduct>`. Drafts and archived products are never returned. |
| GET | `/products/:slug` | One published product. 404 otherwise. |
| GET | `/categories` | Public categories. |
| GET | `/materials` | Material keys, labels and colour tokens. |
| GET | `/settings/public` | WhatsApp number (digits only, or null), currency, languages. |
| POST | `/inquiries` | Quote request. Rate limited to 8 per IP per hour (`DEV_INQUIRY_LIMIT_PER_HOUR` can raise this in development only). Validated by `inquiryCreateSchema`. Returns `{ reference, submittedAt, language }`, e.g. `INQ-2026-000123`. |

`POST /inquiries` checks: honeypot `website` must be empty, `formStartedAt` must be at least 3 seconds old and not older than the maximum form age, and per-IP rate limiting. Item prices are snapshotted server-side, so later price changes do not alter past requests.

## Auth

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/login` | Argon2id password check. Sets an HTTP-only session cookie. Generic error for bad credentials. |
| POST | `/auth/logout` | Ends the session. |
| GET | `/auth/me` | Current user and CSRF token. |
| POST | `/auth/change-password` | Requires the current password. |

State-changing admin requests must send the CSRF token in the `x-csrf-token` header. Admin responses carry `Cache-Control: no-store`, including 401s.

## Admin (session + CSRF required)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/products` | All products including drafts and archived. |
| GET | `/admin/products/:id` | One product. |
| POST | `/admin/products` | Create. Uses `productCreateSchema` (strict). Defaults are applied in the service layer. |
| PATCH | `/admin/products/:id` | Partial update using `productUpdateSchema`. Price changes take effect on the public site immediately. |
| PATCH | `/admin/products/:id/publish` | Publish or unpublish. |
| PATCH | `/admin/products/:id/archive` | Archive. |
| DELETE | `/admin/products/:id` | Delete. |
| GET | `/admin/inquiries` | Paginated list with masked phone numbers. |
| GET | `/admin/inquiries/:id` | Full detail, including unmasked phone, status history and notes. |
| PATCH | `/admin/inquiries/:id/status` | Status change, appended to history. |
| PATCH | `/admin/inquiries/:id/notes` | Internal note. |
| POST | `/admin/inquiries/:id/whatsapp-link` | Builds a click-to-chat link. Records nothing on the server. Opening the link and marking a message as sent are recorded by the admin UI as staff notes (see below). Neither is a delivery confirmation. |
| POST | `/admin/uploads/signature` | Signed parameters for a direct browser upload to Cloudinary (folder `premium-seat-covers/products`). Returns `501 NOT_ENABLED` unless all three `CLOUDINARY_*` variables are set. |
| GET | `/admin/customers` | Paginated list with masked phones. Supports filtering (see `customerListQuerySchema`). |
| GET | `/admin/customers/:id` | One customer: consent, opt-out state and note, and linked inquiries. |
| PATCH | `/admin/customers/:id/opt-out` | Body: `optedOut` and an optional note. **Staff can opt a customer out. Only owners can opt a customer back in** (others get 403). Opt-out is sticky: a new consented quote request does not clear it. |
| GET | `/admin/campaigns` | Campaign list. |
| POST | `/admin/campaigns` | Create a draft (status `draft`). Returns 201. |
| GET | `/admin/campaigns/:id` | One campaign with its counts. |
| PATCH | `/admin/campaigns/:id` | Edit. Only drafts can be edited; a prepared campaign returns 409. |
| POST | `/admin/campaigns/:id/prepare` | Fixes the audience from current consent and opt-out state and stores counts `{ eligible, excludedNoConsent, excludedOptedOut }`. Only from draft; a second call returns 409 `CAMPAIGN_NOT_DRAFT`. |
| GET | `/admin/campaigns/:id/recipients` | Paginated recipients with masked phones and link and sent-confirmation timestamps. |
| POST | `/admin/campaigns/:id/recipients/:recipientId/link` | Builds a personalised `wa.me` link. Returns 409 `CUSTOMER_NOT_ELIGIBLE` if the customer has since opted out or lost consent. Records nothing. |
| POST | `/admin/campaigns/:id/recipients/:recipientId/link-opened` | Records that staff opened the link. Idempotent: the first timestamp is kept. |
| POST | `/admin/campaigns/:id/recipients/:recipientId/sent-confirmed` | Records that staff sent the message, with their name. Stored separately from `link-opened`. Not a delivery receipt. |

Campaign messages are sent by staff from their own WhatsApp. The server never sends them.

### Product images

`POST /admin/products` and `PATCH /admin/products/:id` accept `images`, an array of at most 10 items. Each item has:

- `url`: HTTPS, at most 500 characters, and must start with `https://res.cloudinary.com/`. Other hosts are rejected.
- `publicId`: 3 to 200 characters.
- `alt`: `{ en, hi }`, both required.
- `order`: integer 0 to 50. The web form sets this to the image's position in the list.

The API also checks the Cloudinary account name in the URL. If uploads are not configured, a product with images returns `501 NOT_ENABLED`. A product without images is saved normally.

## Not implemented

- Admin translation endpoints. They are not in the spec, so none exist yet.
- WhatsApp Business API sending. The provider interface has `createMessageLink` only. `sendTemplateMessage` and `processDeliveryStatus` throw "not enabled". Campaign delivery is therefore recorded by staff, not confirmed by WhatsApp.
- Contact form endpoint. The contact page uses WhatsApp and the quote form.

## WhatsApp tracking (staff notes)

The API has no delivery status for click-to-chat links, so the admin UI records what staff did as notes on the inquiry. These exact strings are written by the UI:

- `WhatsApp link opened`: staff opened the link (the browser opens it in a new tab, and this note is added on click).
- `Sent on WhatsApp, confirmed by staff`: staff confirmed they sent the message themselves.

Neither note changes the inquiry status. Campaign recipients have their own tracking fields (see the campaign endpoints above), which do not touch inquiry notes.


# Architecture

```
Browser ──► Caddy (HTTPS, optional) ──► nginx ──► React app (static files)
                                         │  /api, /uploads
                                         ▼
                                    Express API ──► MongoDB (data in /file/dali-db)
                                         └────────► /file/dali (uploaded files)
```

In development, the Vite server proxies `/api` and `/uploads` to the API. The browser therefore
sees one origin in both development and production, which keeps cookies simple.

## Backend layout

```
backend/src/
  config/       environment validation, logger, database connection
  lib/          errors, helpers, mailer, district list
  middleware/   auth, rate limits, error handling
  modules/      one folder per feature: model, routes, and a service where logic is non-trivial
  seed/         demo data, create-admin script
  tests/        integration tests against a real MongoDB
```

Routes parse every input with Zod before use. This also blocks NoSQL operator injection, because
a value such as `{ "$ne": null }` fails validation when a string is expected. Errors are thrown as
`ApiError` and converted to a single JSON shape in `middleware/error.ts`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [] } }
```

## How one catalogue holds many product types

| Concept | Implementation | Example |
| --- | --- | --- |
| Category tree | `Category.parent` and `ancestors[]` | Filtering "Fashion" also returns Watches |
| Variants | `variants[]`, each with its own SKU, price, stock and free-form `options` | Rice: `{ Weight: "5 kg" }`; shirt: `{ Size: "M" }` |
| Specifications | `attributes[]` of name and value | `Warranty: 2 years` |
| Bulk minimums | `minOrderQty` | MOQ 5 on the first-order deal |
| Homepage placement | `sections[]` | `trending`, `best-deal` |

Adding a new product type needs no code or schema change. `priceMin`, `priceMax`, `compareAtPrice`,
`discountPercent` and `totalStock` are derived from the variants on save, so listings can sort and
filter without reading every variant. The displayed discount always describes the cheapest variant.

## Key rules

**Money.** All amounts are integers in poisha (৳1 = 100). The frontend converts for display and
input only.

**Pricing.** The client sends only product, variant and quantity. `orders/pricing.ts` is the single
source of prices, delivery fees and discounts, for both the cart quote and the final order.

**Stock.** Each line is reserved with one atomic update that matches only if enough stock remains,
so two customers cannot buy the last unit. The app does not need a MongoDB replica set: if a later
step fails, stock and coupon use already reserved are released. A process crash between those steps
could leave stock reserved without an order. Moving to multi-document transactions on a replica set
would close this gap; see the [roadmap](./ROADMAP.md).

**Double submits.** Checkout sends an idempotency key, with a unique index on user and key, so a
retry returns the original order.

**Order status.** Changes follow `ORDER_TRANSITIONS` in `order.model.ts`. Each change matches on the
current status, so racing updates cannot restock twice.

```
pending → confirmed → processing → shipped → delivered → returned
   └──────────┴────────────┴─ cancelled      └─ returned
```

Cancelling or returning restores stock. Cancelling also frees the coupon use. Delivery marks a
cash-on-delivery order as paid.

## Security

| Area | Measure |
| --- | --- |
| Passwords | bcrypt; the same response for wrong password and unknown email |
| Sessions | 15-minute access token held in memory; refresh token in an httpOnly, SameSite=Lax cookie, stored hashed |
| Stolen tokens | Refresh tokens rotate on each use; reuse revokes that login's tokens, after a 10-second grace period for multiple tabs |
| Permissions | `requireAuth` and `requireAdmin`; customers can only reach their own orders |
| Abuse | Rate limits per visitor on password routes, forms and the whole API |
| Database | Password protected in Docker, with no port published |
| Configuration | Production refuses to start with the example secret; secrets are only ever in `.env` files |
| Uploads | Admin only, size limits per type, file type checked from its bytes, random file names, no SVG or HTML |
| Headers | helmet on the API; CSP and related headers from nginx |
| Tracking | Public order tracking needs the phone number and shows no personal details |

A disabled or banned user's access token keeps working until it expires, for at most 15 minutes.

## Frontend

- **Server data:** TanStack Query.
- **Client state:** Zustand, with auth in memory and the cart in localStorage. When signed in, cart
  changes are also saved to the account and merged at sign-in, so a guest cart is kept.
- **Routing:** React Router, with pages other than the homepage loaded on demand.
- **Design tokens:** colours sampled from the design, in `src/index.css`.

## Known limits

- Search uses a case-insensitive pattern match, which scans products. It suits thousands of products;
  beyond that, move to Atlas Search or similar.
- Saving the admin product form writes the stock shown when the form opened, so sales made while it
  was open can be overwritten.
- Rate-limit counters live in memory, so they reset on restart and are per-process. Use a shared store
  if you run several API instances.
- Uploaded images are on one server's disk, which also needs a shared store for several instances.

# API reference

Base URL: `/api/v1`. Requests and responses are JSON, and all money is in **poisha** (৳1 = 100).

**Authentication:** send `Authorization: Bearer <accessToken>`. Access lasts 15 minutes; call
`POST /auth/refresh` with the cookie to get a new token.

**Access column:** Public, Optional (works signed out, with extras when signed in), Customer (any
signed-in user), or Admin.

**Lists** accept `page` and `limit` (at most 100), and return
`{ items, page, limit, total, pages }`.

**Errors** return `{ "error": { "code", "message", "details" } }`.

| Status | Meaning |
| --- | --- |
| 400 | Bad request, or a coupon that cannot be used |
| 401 | Not signed in, or the session expired |
| 403 | Not allowed |
| 404 | Not found |
| 409 | Conflict, such as items unavailable (`CART_ITEMS_UNAVAILABLE`) or an invalid status change |
| 422 | Validation failed; `details` lists each field |
| 429 | Rate limited |

## Auth

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/register` | Public | Body `{ name, email, password, phone? }`. Returns `{ user, accessToken }` and sets the cookie |
| `POST /auth/login` | Public | Body `{ email, password }` |
| `POST /auth/refresh` | Cookie | Rotates the cookie and returns a new token |
| `POST /auth/logout` | Cookie | Ends the session |
| `POST /auth/forgot-password` | Public | Body `{ email }`. The response is the same whether or not the account exists |
| `POST /auth/reset-password` | Public | Body `{ token, password }` |

## Account

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET`, `PATCH /users/me` | Customer | Read or update name and phone |
| `POST /users/me/password` | Customer | Body `{ currentPassword, newPassword }`. Ends all sessions |
| `POST /users/me/addresses` | Customer | Add an address |
| `PATCH`, `DELETE /users/me/addresses/:id` | Customer | Change or remove an address |
| `GET /users/me/wishlist` | Customer | Returns `{ ids, items }` |
| `PUT`, `DELETE /users/me/wishlist/:productId` | Customer | Save or remove a product |

An address is `{ label, fullName, phone, district, area, line1, isDefault }`. `phone` must be a
Bangladeshi mobile number and `district` one of the 64 districts in `lib/districts.ts`.

## Catalogue

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /categories` | Public | All active categories, flat |
| `GET /categories/admin/list` | Admin | Every category including hidden ones, with `productCount` covering subcategories |
| `POST /categories`, `PATCH`, `DELETE /categories/:id` | Admin | Deleting needs no subcategories or products |
| `GET /products` | Public | See the parameters below. Also returns `facets.brands` |
| `GET /products/suggest?q=` | Public | Up to 8 search suggestions |
| `GET /products/:slug` | Public | Returns `{ product, breadcrumb, related }` |
| `GET /products/admin/list`, `/products/admin/:id` | Admin | Includes drafts. List accepts `q`, `status`, `stock` (`in`, `low`, `out`), `section`, `category` (id) and `sort`, and returns `stats` |
| `POST /products`, `PATCH`, `DELETE /products/:id` | Admin | See the product body below |
| `GET /reviews/product/:id` | Public | Reviews for a product |
| `POST /reviews` | Customer | Body `{ product, rating, comment }`. Needs a delivered order containing the product |
| `DELETE /reviews/:id` | Admin | Remove a review |

`GET /products` parameters: `q`, `category` (slug, includes subcategories), `brand` (comma-separated),
`minPrice`, `maxPrice`, `rating`, `inStock`, `onSale`, `section`, and `sort` (`relevance`, `newest`,
`price-asc`, `price-desc`, `rating`, `popular`, `discount`). `section` is one of `customer-favorites`, `for-you`, `trending`, `best-deal`, `first-order-deal`, `featured`.

Product body:

```json
{
  "name": "Premium Miniket Rice",
  "category": "<categoryId>",
  "brand": "Khet Fresh",
  "description": "…",
  "images": ["/uploads/abc.jpg"],
  "tags": ["rice"],
  "attributes": [{ "name": "Origin", "value": "Bangladesh" }],
  "variants": [
    { "sku": "RICE-5", "options": { "Weight": "5 kg" }, "price": 39000, "compareAtPrice": 43000, "stock": 40 }
  ],
  "minOrderQty": 1,
  "sections": ["trending"],
  "status": "active"
}
```

When editing, keep each variant's `_id`, or carts holding that variant will show it as unavailable.

## Cart

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /cart/quote` | Optional | Body `{ items, district?, couponCode? }`. Returns priced `lines`, `unavailable`, `subtotal`, `shippingFee`, `discount`, `total`, `couponCode`, `couponError` |
| `GET`, `PUT /cart` | Customer | Read or replace the saved cart |
| `POST /cart/merge` | Customer | Add a guest cart to the saved one |

`items` is an array of `{ product, variant, quantity }`.

Delivery costs ৳60 in Dhaka and ৳120 elsewhere, and is free from ৳5,000 (`SHIPPING` in
`orders/pricing.ts`).

## Orders

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /orders` | Customer | See the body below. `201` when created, `200` when the idempotency key was already used |
| `GET /orders/mine`, `/orders/mine/:id` | Customer | The customer's own orders |
| `POST /orders/mine/:id/cancel` | Customer | Allowed while `pending` or `confirmed` |
| `POST /orders/track` | Public | Body `{ orderNumber, phone }`. Returns progress only |
| `GET /orders`, `/orders/:id` | Admin | List accepts `status`, `payment` and `q`, and returns `stats` per status. Detail adds `nextStatuses` |
| `PATCH /orders/:id/status` | Admin | Body `{ status, note? }` |

```json
{
  "idempotencyKey": "unique-per-checkout",
  "items": [{ "product": "<id>", "variant": "<id>", "quantity": 1 }],
  "shippingAddress": { "fullName": "…", "phone": "01712345678", "district": "Dhaka", "area": "…", "line1": "…" },
  "couponCode": "WELCOME10",
  "note": "Call before delivery",
  "paymentMethod": "cod"
}
```

## Admin and content

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /content/home` | Optional | Everything on the homepage, including `categoryShowcases`: up to 4 categories with `homeShowcase` set, each with 4 products |
| `GET`, `POST /content/banners`; `PATCH`, `DELETE /content/banners/:id` | Admin | Manage banners |
| `GET`, `POST /coupons`; `PATCH`, `DELETE /coupons/:id` | Admin | Manage coupons |
| `POST /uploads` | Admin | Multipart fields `folder` (`products`, `categories`, `banners`, `general`), then `file`. JPG, PNG or WebP up to 5 MB, MP4 or WebM up to 100 MB, PDF, DOCX or XLSX up to 20 MB. Returns `{ url, kind }` |
| `GET /admin/dashboard` | Admin | Totals, low stock, recent orders |
| `GET`, `POST /admin/users`; `GET`, `PATCH`, `DELETE /admin/users/:id` | Admin | List accepts `q`, `role` and `status` (`active`, `disabled`, `banned`), and returns `stats` and each user's `orderCount`. Patch accepts `name`, `email`, `phone`, `role`, `password`, `isActive`, `isBanned` and `banReason`. Admins cannot change their own role, status or password here, or delete themselves |
| `GET /health` (not under `/api/v1`) | Public | `200` when the database is connected |

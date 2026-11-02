# Dali: project plan

**Dali** ("Everything in One Basket") is a general-merchandise store selling many product types
(grocery, fashion, beauty, tech, baby, pets and more) to customers in Bangladesh.

## Goals

1. Implement the homepage in [`design/homepage_design.png`](design/homepage_design.png) using the logo in [`design/dali_logo.svg`](design/dali_logo.svg).
2. Support any product type with one catalogue model, without schema changes per category.
3. Cover the full purchase journey: browse, search, cart, checkout, track, review, return.
4. Give staff an admin panel for catalogue, orders, coupons, banners and users.

## Key decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Stack | MongoDB, Express 5, React 19, Node 24, TypeScript throughout | MERN as requested; types catch errors across a large codebase |
| Product variety | Category tree + `variants[]` with free-form options + `attributes[]` specs | A T-shirt (size/colour) and rice (weight) use the same model |
| Money | Integer poisha, currency BDT | Avoids floating-point rounding errors |
| Payments | Cash on delivery first, behind a `paymentMethod` field | The design leads with COD; gateways need merchant accounts |
| Selling model | Single store | A marketplace (payouts, seller dashboards) is a separate project |
| Stock | Atomic conditional updates, with rollback on partial failure | Prevents overselling without requiring a replica set |
| Auth | 15-minute JWT in memory + rotating refresh token in an httpOnly cookie | Limits token theft through XSS; reuse is detected |
| Pricing | The server recalculates every price at quote and at order time | Client-side prices are never trusted |
| Files | Validated uploads in `/file/dali` on the server, outside Docker, replaceable by object storage | Survives redeploys and needs no cloud account |

## Phases

1. **Foundation:** workspaces, env validation, logging, error handling, security middleware.
2. **Backend:** auth, categories, products, reviews, cart, coupons, orders, banners, uploads, admin.
3. **Seed data:** categories, demo products, banners, coupons, admin account.
4. **Storefront:** homepage from the design, catalogue, product page, cart, checkout, account.
5. **Admin panel:** dashboard and management screens.
6. **Quality:** automated tests, a browser walkthrough, a design comparison, Docker, CI, docs.

## Out of scope for this version

Online payment gateways, SMS sending, courier integrations, seller dashboards and payouts. See [roadmap](./ROADMAP.md).

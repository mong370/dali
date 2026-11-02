# Roadmap

Not built yet, roughly in priority order.

## Before or soon after launch

1. **Real product photos.** The demo uses generated illustrations. Replace them from the admin panel.
2. **Order emails and SMS.** Password-reset email works through `SMTP_URL`. Order updates are not sent yet, and customers in Bangladesh often expect them by SMS.
3. **Online payments.** bKash, Nagad or SSLCommerz. Needs merchant accounts. Add a value to `paymentMethod`, a payment-start route and a signed webhook that marks the order as paid.
4. **Courier integration.** Pathao, Steadfast or RedX, for tracking numbers and automatic status updates.

## Growth

5. **Better search.** Atlas Search or similar, for typo tolerance and relevance.
6. **Guest checkout.** Common in cash-on-delivery markets; currently customers need an account.
7. **Fuller customer-requested returns.** Today staff record returns; customers can't start one online.
8. **Stronger order consistency.** Move to multi-document transactions on a replica set.

9. **Images at scale.** Object storage, a CDN and automatic resizing.
10. **Bangla language support.**
11. **Server-side rendering or prerendering,** so search engines see product pages more reliably.

## Marketplace

12. **Sellers and dropshippers.** A true marketplace needs seller accounts and dashboards, per-seller orders, commissions and payouts. This is a large separate project.

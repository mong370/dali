import { Router } from 'express';
import { z } from 'zod';
import { objectId } from '../../lib/helpers.js';
import { currentUser, optionalAuth, requireAuth } from '../../middleware/auth.js';
import { buildQuote, type RequestedItem } from '../orders/pricing.js';
import { Cart } from './cart.model.js';

const items = z
  .array(z.object({ product: objectId, variant: objectId, quantity: z.number().int().min(1).max(999) }))
  .max(100);

const serialize = (cartItems: { product: unknown; variant: unknown; quantity: number }[]) =>
  cartItems.map((item) => ({
    product: String(item.product),
    variant: String(item.variant),
    quantity: item.quantity,
  }));

export const cartRouter = Router();

// Open to guests: prices the items a browser holds in its local cart.
cartRouter.post('/quote', optionalAuth, async (req, res) => {
  const body = z
    .object({
      items,
      district: z.string().trim().max(60).optional(),
      couponCode: z.string().trim().max(40).optional(),
    })
    .parse(req.body);
  res.json(await buildQuote({ ...body, userId: req.user?.id }));
});

cartRouter.get('/', requireAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: currentUser(req).id }).lean();
  res.json({ items: serialize(cart?.items ?? []) });
});

cartRouter.put('/', requireAuth, async (req, res) => {
  const body = z.object({ items }).parse(req.body);
  const cart = await Cart.findOneAndUpdate(
    { user: currentUser(req).id },
    { items: body.items },
    { upsert: true, returnDocument: 'after' },
  );
  res.json({ items: serialize(cart.items) });
});

// Called after sign-in: adds the guest cart to the saved one, taking the larger quantity of duplicates.
cartRouter.post('/merge', requireAuth, async (req, res) => {
  const body = z.object({ items }).parse(req.body);
  const userId = currentUser(req).id;
  const saved = await Cart.findOne({ user: userId });

  const merged = new Map<string, RequestedItem>();
  for (const item of [...serialize(saved?.items ?? []), ...body.items]) {
    const key = `${item.product}:${item.variant}`;
    const quantity = Math.max(merged.get(key)?.quantity ?? 0, item.quantity);
    merged.set(key, { ...item, quantity });
  }

  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { items: [...merged.values()] },
    { upsert: true, returnDocument: 'after' },
  );
  res.json({ items: serialize(cart.items) });
});

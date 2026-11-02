import { ApiError } from '../../lib/ApiError.js';
import { randomSuffix } from '../../lib/helpers.js';
import { logger } from '../../config/logger.js';
import { Cart } from '../cart/cart.model.js';
import { Coupon } from '../coupons/coupon.model.js';
import { Product } from '../products/product.model.js';
import {
  ORDER_TRANSITIONS,
  Order,
  type OrderDoc,
  type OrderStatus,
} from './order.model.js';
import { evaluateCoupon, priceItems, shippingFeeFor, type RequestedItem } from './pricing.js';

interface Reservation {
  product: unknown;
  variant: unknown;
  quantity: number;
}

function adjustStock({ product, variant, quantity }: Reservation, direction: 1 | -1) {
  return Product.updateOne(
    {
      _id: product,
      // When taking stock, match only if enough remains. This makes overselling impossible.
      variants: {
        $elemMatch: { _id: variant, ...(direction === -1 && { stock: { $gte: quantity } }) },
      },
    },
    {
      $inc: {
        'variants.$.stock': direction * quantity,
        totalStock: direction * quantity,
        soldCount: -direction * quantity,
      },
    },
  );
}

async function releaseStock(reservations: Reservation[]) {
  await Promise.all(reservations.map((reservation) => adjustStock(reservation, 1)));
}

async function reserveCoupon(couponId: unknown) {
  const reserved = await Coupon.updateOne(
    {
      _id: couponId,
      $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    },
    { $inc: { usedCount: 1 } },
  );
  if (reserved.modifiedCount === 0) {
    throw ApiError.badRequest('This coupon has been fully used', 'COUPON_EXHAUSTED');
  }
}

const orderNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `DL-${date}-${randomSuffix(3).toUpperCase()}`;
};

export async function createOrder(input: {
  userId: string;
  idempotencyKey: string;
  items: RequestedItem[];
  shippingAddress: { fullName: string; phone: string; district: string; area: string; line1: string };
  couponCode?: string;
  note?: string;
}): Promise<{ order: OrderDoc; created: boolean }> {
  const { userId, idempotencyKey } = input;

  const existing = await Order.findOne({ user: userId, idempotencyKey });
  if (existing) return { order: existing, created: false };

  const priced = await priceItems(input.items);
  const problems = [
    ...priced.unavailable,
    ...priced.lines.filter((line) => line.issue).map(({ product, variant, issue }) => ({
      product,
      variant,
      issue: issue as string,
    })),
  ];
  if (problems.length > 0 || priced.lines.length === 0) {
    throw ApiError.conflict(
      'Some items in your cart need attention',
      'CART_ITEMS_UNAVAILABLE',
      problems,
    );
  }

  const shippingFee = shippingFeeFor(priced.subtotal, input.shippingAddress.district);
  const applied = input.couponCode
    ? await evaluateCoupon(input.couponCode, userId, priced.subtotal, shippingFee)
    : undefined;

  // Standalone MongoDB has no multi-document transactions, so each step is an
  // atomic update and anything already reserved is released if a later step fails.
  if (applied) await reserveCoupon(applied.coupon._id);
  const reserved: Reservation[] = [];
  const rollback = async () => {
    await releaseStock(reserved);
    if (applied) await Coupon.updateOne({ _id: applied.coupon._id }, { $inc: { usedCount: -1 } });
  };

  try {
    for (const line of priced.lines) {
      const result = await adjustStock(line, -1);
      if (result.modifiedCount === 0) {
        throw ApiError.conflict(
          `${line.name} has just sold out`,
          'CART_ITEMS_UNAVAILABLE',
          [{ product: line.product, variant: line.variant, issue: 'Out of stock' }],
        );
      }
      reserved.push(line);
    }

    const discount = applied?.discount ?? 0;
    const order = await Order.create({
      orderNumber: orderNumber(),
      user: userId,
      idempotencyKey,
      items: priced.lines.map((line) => ({
        product: line.product,
        variant: line.variant,
        name: line.name,
        slug: line.slug,
        image: line.image,
        sku: line.sku,
        options: line.options,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      shippingAddress: input.shippingAddress,
      subtotal: priced.subtotal,
      shippingFee,
      discount,
      total: priced.subtotal + shippingFee - discount,
      couponCode: applied?.coupon.code,
      note: input.note ?? '',
      statusHistory: [{ status: 'pending', note: 'Order placed' }],
    });

    await Cart.updateOne({ user: userId }, { items: [] }).catch((err: unknown) =>
      logger.warn({ err }, 'Could not clear cart after order'),
    );
    return { order, created: true };
  } catch (err) {
    await rollback();
    // Two simultaneous submissions: the other request won, so return its order.
    if ((err as { code?: number }).code === 11000) {
      const winner = await Order.findOne({ user: userId, idempotencyKey });
      if (winner) return { order: winner, created: false };
    }
    throw err;
  }
}

export async function changeOrderStatus(
  order: OrderDoc,
  next: OrderStatus,
  note?: string,
): Promise<OrderDoc> {
  const from = order.status;
  if (!ORDER_TRANSITIONS[from].includes(next)) {
    throw ApiError.conflict(`An order cannot go from ${from} to ${next}`, 'INVALID_TRANSITION');
  }

  const paymentStatus =
    next === 'delivered'
      ? 'paid'
      : next === 'returned' && order.paymentStatus === 'paid'
        ? 'refunded'
        : order.paymentStatus;

  // Matching on the current status means only one of two racing updates restocks.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: from },
    {
      status: next,
      paymentStatus,
      $push: { statusHistory: { status: next, note, at: new Date() } },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw ApiError.conflict('This order was just updated. Refresh and try again.');

  if (next === 'cancelled' || next === 'returned') {
    await releaseStock(updated.items);
  }
  if (next === 'cancelled' && updated.couponCode) {
    await Coupon.updateOne(
      { code: updated.couponCode, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
    );
  }
  return updated;
}

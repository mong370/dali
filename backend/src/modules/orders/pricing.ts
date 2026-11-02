import { ApiError } from '../../lib/ApiError.js';
import { Coupon, type CouponAttrs } from '../coupons/coupon.model.js';
import { Product } from '../products/product.model.js';
import { Order } from './order.model.js';

// All amounts in poisha.
export const SHIPPING = { insideDhaka: 6_000, outsideDhaka: 12_000, freeOver: 500_000 };

export interface RequestedItem {
  product: string;
  variant: string;
  quantity: number;
}

export function shippingFeeFor(subtotal: number, district?: string) {
  if (subtotal === 0 || subtotal >= SHIPPING.freeOver) return 0;
  return !district || district === 'Dhaka' ? SHIPPING.insideDhaka : SHIPPING.outsideDhaka;
}

/** Combines repeated lines for the same variant, so stock is checked against the real total. */
function mergeItems(items: RequestedItem[]) {
  const merged = new Map<string, RequestedItem>();
  for (const item of items) {
    const key = `${item.product}:${item.variant}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  }
  return [...merged.values()];
}

/** Prices items from the database. Problems are reported per line rather than thrown. */
export async function priceItems(items: RequestedItem[]) {
  const requested = mergeItems(items);
  const products = await Product.find({
    _id: { $in: requested.map((item) => item.product) },
    status: 'active',
  });
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const lines = [];
  const unavailable: { product: string; variant: string; issue: string }[] = [];

  for (const item of requested) {
    const product = byId.get(item.product);
    const variant = product?.variants.id(item.variant);
    if (!product || !variant) {
      unavailable.push({
        product: item.product,
        variant: item.variant,
        issue: 'This item is no longer available',
      });
      continue;
    }

    let issue: string | undefined;
    if (variant.stock < item.quantity) {
      issue = variant.stock === 0 ? 'Out of stock' : `Only ${variant.stock} left in stock`;
    } else if (item.quantity < product.minOrderQty) {
      issue = `Minimum order quantity is ${product.minOrderQty}`;
    }

    lines.push({
      product: item.product,
      variant: item.variant,
      name: product.name,
      slug: product.slug,
      image: product.images[0],
      sku: variant.sku,
      options: Object.fromEntries(variant.options ?? new Map<string, string>()),
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      stock: variant.stock,
      minOrderQty: product.minOrderQty,
      quantity: item.quantity,
      lineTotal: variant.price * item.quantity,
      issue,
    });
  }

  return {
    lines,
    unavailable,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}

function discountFor(coupon: CouponAttrs, subtotal: number, shippingFee: number) {
  const cap = (amount: number) =>
    coupon.maxDiscount > 0 ? Math.min(amount, coupon.maxDiscount) : amount;
  switch (coupon.type) {
    case 'percent':
      return cap(Math.floor((subtotal * coupon.value) / 100));
    case 'fixed':
      return Math.min(coupon.value, subtotal);
    case 'free_shipping':
      return cap(shippingFee);
  }
}

/** Throws an ApiError explaining why the coupon cannot be used. */
export async function evaluateCoupon(
  code: string,
  userId: string | undefined,
  subtotal: number,
  shippingFee: number,
) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  const now = Date.now();
  if (
    !coupon ||
    (coupon.startsAt && coupon.startsAt.getTime() > now) ||
    (coupon.expiresAt && coupon.expiresAt.getTime() < now)
  ) {
    throw ApiError.badRequest('This coupon is not valid', 'COUPON_INVALID');
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has been fully used', 'COUPON_EXHAUSTED');
  }
  if (subtotal < coupon.minSubtotal) {
    throw ApiError.badRequest(
      `This coupon needs a minimum order of ৳${coupon.minSubtotal / 100}`,
      'COUPON_MIN_SUBTOTAL',
    );
  }
  if (coupon.firstOrderOnly) {
    if (!userId) throw ApiError.badRequest('Sign in to use this coupon', 'COUPON_SIGN_IN');
    const hasOrdered = await Order.exists({ user: userId, status: { $ne: 'cancelled' } });
    if (hasOrdered) {
      throw ApiError.badRequest('This coupon is for first orders only', 'COUPON_FIRST_ORDER');
    }
  }
  return { coupon, discount: discountFor(coupon, subtotal, shippingFee) };
}

export async function buildQuote(input: {
  items: RequestedItem[];
  district?: string;
  couponCode?: string;
  userId?: string;
}) {
  const priced = await priceItems(input.items);
  const shippingFee = shippingFeeFor(priced.subtotal, input.district);

  let discount = 0;
  let couponError: string | undefined;
  let couponCode: string | undefined;
  if (input.couponCode && priced.subtotal > 0) {
    try {
      const result = await evaluateCoupon(
        input.couponCode,
        input.userId,
        priced.subtotal,
        shippingFee,
      );
      discount = result.discount;
      couponCode = result.coupon.code;
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      couponError = err.message;
    }
  }

  return {
    ...priced,
    shippingFee,
    discount,
    couponCode,
    couponError,
    total: priced.subtotal + shippingFee - discount,
  };
}

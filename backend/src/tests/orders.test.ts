import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Coupon } from '../modules/coupons/coupon.model.js';
import { Order } from '../modules/orders/order.model.js';
import { Product } from '../modules/products/product.model.js';
import {
  ADDRESS,
  api,
  clearDb,
  createAdmin,
  createProduct,
  lineFor,
  registerCustomer,
  setupDb,
  teardownDb,
} from './helpers.js';

const placeOrder = (token: string, items: unknown[], extra: object = {}) =>
  api()
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ idempotencyKey: randomUUID(), items, shippingAddress: ADDRESS, ...extra });

const stockOf = async (id: unknown) => (await Product.findById(id))!.variants[0]!.stock;

describe('orders', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  it('calculates totals on the server and ignores any client-sent price', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ price: 500_00, stock: 5 });
    const response = await placeOrder(token, [{ ...lineFor(product, 2), price: 1 }]).expect(201);
    expect(response.body.order.subtotal).toBe(1000_00);
    expect(response.body.order.shippingFee).toBe(60_00);
    expect(response.body.order.total).toBe(1060_00);
    expect(await stockOf(product._id)).toBe(3);
  });

  it('charges more outside Dhaka and nothing above the free-shipping threshold', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ price: 6000_00 });
    const cheap = await createProduct({ price: 100_00 });
    const outside = { ...ADDRESS, district: 'Sylhet' };
    const small = await placeOrder(token, [lineFor(cheap)], { shippingAddress: outside });
    expect(small.body.order.shippingFee).toBe(120_00);
    const large = await placeOrder(token, [lineFor(product)], { shippingAddress: outside });
    expect(large.body.order.shippingFee).toBe(0);
  });

  it('never oversells when customers race for the last units', async () => {
    const product = await createProduct({ stock: 3 });
    const customers = await Promise.all(Array.from({ length: 8 }, () => registerCustomer()));
    const results = await Promise.all(
      customers.map(({ token }) => placeOrder(token, [lineFor(product)])),
    );
    expect(results.filter((result) => result.status === 201)).toHaveLength(3);
    expect(results.filter((result) => result.status === 409)).toHaveLength(5);
    expect(await stockOf(product._id)).toBe(0);
  });

  it('releases earlier items if a later item in the same order cannot be reserved', async () => {
    const { token } = await registerCustomer();
    const available = await createProduct({ stock: 5 });
    const scarce = await createProduct({ stock: 1 });
    await placeOrder(token, [lineFor(available), lineFor(scarce, 2)]).expect(409);
    expect(await stockOf(available._id)).toBe(5);
    expect(await stockOf(scarce._id)).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('counts repeated cart lines together when checking stock', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ stock: 3 });
    await placeOrder(token, [lineFor(product, 2), lineFor(product, 2)]).expect(409);
    expect(await stockOf(product._id)).toBe(3);
  });

  it('enforces the minimum order quantity', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ minOrderQty: 3 });
    await placeOrder(token, [lineFor(product, 2)]).expect(409);
    await placeOrder(token, [lineFor(product, 3)]).expect(201);
  });

  it('creates one order when the same checkout is submitted twice', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ stock: 5 });
    const extra = { idempotencyKey: randomUUID() };
    const [first, second] = await Promise.all([
      placeOrder(token, [lineFor(product)], extra),
      placeOrder(token, [lineFor(product)], extra),
    ]);
    expect(first.body.order._id).toBe(second.body.order._id);
    expect(await Order.countDocuments()).toBe(1);
    expect(await stockOf(product._id)).toBe(4);
  });

  it('restores stock and coupon use on cancellation, once only', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ stock: 5, price: 1000_00 });
    await Coupon.create({ code: 'SAVE', type: 'fixed', value: 100_00 });
    const { body } = await placeOrder(token, [lineFor(product, 2)], { couponCode: 'save' }).expect(201);
    expect(body.order.discount).toBe(100_00);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(1);

    const cancel = () =>
      api()
        .post(`/api/v1/orders/mine/${body.order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`);
    await cancel().expect(200);
    await cancel().expect(409);
    expect(await stockOf(product._id)).toBe(5);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(0);
  });

  it("does not expose another customer's order", async () => {
    const owner = await registerCustomer();
    const stranger = await registerCustomer();
    const product = await createProduct();
    const { body } = await placeOrder(owner.token, [lineFor(product)]).expect(201);
    await api()
      .get(`/api/v1/orders/mine/${body.order._id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);
    await api()
      .post(`/api/v1/orders/mine/${body.order._id}/cancel`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);
  });

  it('enforces status transitions and marks COD as paid on delivery', async () => {
    const { token } = await registerCustomer();
    const admin = await createAdmin();
    const product = await createProduct({ stock: 5 });
    const { body } = await placeOrder(token, [lineFor(product)]).expect(201);
    const setStatus = (status: string) =>
      api()
        .patch(`/api/v1/orders/${body.order._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status });

    await setStatus('delivered').expect(409);
    await setStatus('confirmed').expect(200);
    await setStatus('processing').expect(200);
    await setStatus('shipped').expect(200);
    const delivered = await setStatus('delivered').expect(200);
    expect(delivered.body.order.paymentStatus).toBe('paid');

    const returned = await setStatus('returned').expect(200);
    expect(returned.body.order.paymentStatus).toBe('refunded');
    expect(await stockOf(product._id)).toBe(5);
  });

  it('filters admin orders by status and payment, with counts for every status', async () => {
    const { token } = await registerCustomer();
    const admin = await createAdmin();
    const product = await createProduct({ stock: 9 });
    const first = await placeOrder(token, [lineFor(product)]).expect(201);
    await placeOrder(token, [lineFor(product)]).expect(201);
    const auth = { Authorization: `Bearer ${admin.token}` };
    await api()
      .patch(`/api/v1/orders/${first.body.order._id}/status`)
      .set(auth)
      .send({ status: 'confirmed' })
      .expect(200);
    const list = await api().get('/api/v1/orders?status=pending').set(auth).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.stats).toEqual({ pending: 1, confirmed: 1 });
    const paid = await api().get('/api/v1/orders?payment=paid').set(auth).expect(200);
    expect(paid.body.items).toHaveLength(0);
  });

  it('tracks an order only with the matching phone, without personal details', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct();
    const { body } = await placeOrder(token, [lineFor(product)]).expect(201);
    const track = (phone: string) =>
      api().post('/api/v1/orders/track').send({ orderNumber: body.order.orderNumber, phone });
    await track('01812345678').expect(404);
    const tracked = await track('+8801712345678').expect(200);
    expect(tracked.body.order.status).toBe('pending');
    expect(tracked.body.order.shippingAddress).toBeUndefined();
  });

  it('allows reviews only after delivery, and updates the product rating', async () => {
    const { token } = await registerCustomer();
    const admin = await createAdmin();
    const product = await createProduct();
    const review = () =>
      api()
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ product: String(product._id), rating: 4, comment: 'Good' });

    await review().expect(403);
    const { body } = await placeOrder(token, [lineFor(product)]).expect(201);
    for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
      await api()
        .patch(`/api/v1/orders/${body.order._id}/status`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status })
        .expect(200);
    }
    await review().expect(201);
    const updated = await Product.findById(product._id);
    expect(updated!.ratingAvg).toBe(4);
    expect(updated!.ratingCount).toBe(1);
  });
});

describe('coupons and quotes', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  const quote = (items: unknown[], extra: object = {}, token?: string) => {
    const request = api().post('/api/v1/cart/quote');
    if (token) request.set('Authorization', `Bearer ${token}`);
    return request.send({ items, ...extra });
  };

  it('caps percentage discounts', async () => {
    const product = await createProduct({ price: 10000_00 });
    await Coupon.create({ code: 'P10', type: 'percent', value: 10, maxDiscount: 500_00 });
    const { body } = await quote([lineFor(product)], { couponCode: 'P10' }).expect(200);
    expect(body.discount).toBe(500_00);
  });

  it('reports coupon problems without failing the quote', async () => {
    const product = await createProduct({ price: 100_00 });
    await Coupon.create({
      code: 'OLD',
      type: 'fixed',
      value: 50_00,
      expiresAt: new Date(Date.now() - 1000),
    });
    const { body } = await quote([lineFor(product)], { couponCode: 'OLD' }).expect(200);
    expect(body.discount).toBe(0);
    expect(body.couponError).toMatch(/not valid/);
  });

  it('allows a first-order coupon only on the first order', async () => {
    const { token } = await registerCustomer();
    const product = await createProduct({ price: 100_00 });
    await Coupon.create({ code: 'FIRST', type: 'free_shipping', firstOrderOnly: true });

    const guest = await quote([lineFor(product)], { couponCode: 'FIRST' }).expect(200);
    expect(guest.body.couponError).toMatch(/Sign in/);

    const first = await placeOrder(token, [lineFor(product)], { couponCode: 'FIRST' }).expect(201);
    expect(first.body.order.discount).toBe(60_00);
    expect(first.body.order.total).toBe(100_00);

    await placeOrder(token, [lineFor(product)], { couponCode: 'FIRST' }).expect(400);
    // A rejected coupon must not have reserved any stock.
    expect(await stockOf(product._id)).toBe(9);
  });

  it('does not exceed a coupon usage limit under concurrency', async () => {
    const product = await createProduct({ stock: 50 });
    await Coupon.create({ code: 'LIMIT', type: 'fixed', value: 10_00, usageLimit: 2 });
    const customers = await Promise.all(Array.from({ length: 6 }, () => registerCustomer()));
    const results = await Promise.all(
      customers.map(({ token }) => placeOrder(token, [lineFor(product)], { couponCode: 'LIMIT' })),
    );
    expect(results.filter((result) => result.status === 201)).toHaveLength(2);
    expect((await Coupon.findOne({ code: 'LIMIT' }))!.usedCount).toBe(2);
    expect(await stockOf(product._id)).toBe(48);
  });

  it('flags unavailable items in a quote', async () => {
    const product = await createProduct({ stock: 1 });
    const { body } = await quote([lineFor(product, 3)]).expect(200);
    expect(body.lines[0].issue).toMatch(/Only 1 left/);
  });

  it('merges a guest cart into the saved cart', async () => {
    const { token } = await registerCustomer();
    const first = await createProduct();
    const second = await createProduct();
    const auth = { Authorization: `Bearer ${token}` };
    await api().put('/api/v1/cart').set(auth).send({ items: [lineFor(first, 2)] }).expect(200);
    const { body } = await api()
      .post('/api/v1/cart/merge')
      .set(auth)
      .send({ items: [lineFor(first, 1), lineFor(second, 1)] })
      .expect(200);
    expect(body.items).toHaveLength(2);
    expect(body.items.find((item: { product: string }) => item.product === String(first._id)).quantity).toBe(2);
  });
});

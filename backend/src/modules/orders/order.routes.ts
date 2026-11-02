import { Router } from 'express';
import type { QueryFilter } from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import {
  escapeRegex,
  idParams,
  objectId,
  paginated,
  paginationQuery,
} from '../../lib/helpers.js';
import { currentUser, requireAdmin, requireAuth } from '../../middleware/auth.js';
import { formLimiter } from '../../middleware/rateLimit.js';
import { addressBody, phone } from '../users/user.routes.js';
import { ORDER_STATUSES, ORDER_TRANSITIONS, Order, type OrderAttrs } from './order.model.js';
import { changeOrderStatus, createOrder } from './order.service.js';

const itemsBody = z
  .array(z.object({ product: objectId, variant: objectId, quantity: z.number().int().min(1).max(999) }))
  .min(1, 'Your cart is empty')
  .max(100);

const createBody = z.object({
  idempotencyKey: z.string().min(8).max(64),
  items: itemsBody,
  shippingAddress: addressBody.pick({
    fullName: true,
    phone: true,
    district: true,
    area: true,
    line1: true,
  }),
  couponCode: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.literal('cod').default('cod'),
});

const lastElevenDigits = (value: string) => value.replace(/\D/g, '').slice(-11);

export const orderRouter = Router();

// Public, so it reveals only delivery progress and requires the phone on the order.
orderRouter.post('/track', formLimiter, async (req, res) => {
  const body = z
    .object({ orderNumber: z.string().trim().toUpperCase().max(30), phone })
    .parse(req.body);
  const order = await Order.findOne({ orderNumber: body.orderNumber })
    .select('orderNumber status statusHistory createdAt shippingAddress.phone total items.name items.quantity')
    .lean();
  if (
    !order ||
    lastElevenDigits(order.shippingAddress?.phone ?? '') !== lastElevenDigits(body.phone)
  ) {
    throw ApiError.notFound('No order matches that number and phone');
  }
  const { shippingAddress: _omitted, ...tracking } = order;
  res.json({ order: tracking });
});

orderRouter.post('/', requireAuth, async (req, res) => {
  const body = createBody.parse(req.body);
  const { order, created } = await createOrder({ ...body, userId: currentUser(req).id });
  res.status(created ? 201 : 200).json({ order });
});

orderRouter.get('/mine', requireAuth, async (req, res) => {
  const { page, limit } = paginationQuery.parse(req.query);
  const filter = { user: currentUser(req).id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json(paginated(items, total, page, limit));
});

orderRouter.get('/mine/:id', requireAuth, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await Order.findOne({ _id: id, user: currentUser(req).id }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ order });
});

orderRouter.post('/mine/:id/cancel', requireAuth, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await Order.findOne({ _id: id, user: currentUser(req).id });
  if (!order) throw ApiError.notFound('Order not found');
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw ApiError.conflict('This order can no longer be cancelled', 'CANNOT_CANCEL');
  }
  res.json({ order: await changeOrderStatus(order, 'cancelled', 'Cancelled by customer') });
});

orderRouter.get('/', requireAdmin, async (req, res) => {
  const query = paginationQuery
    .extend({
      status: z.enum(ORDER_STATUSES).optional(),
      payment: z.enum(['unpaid', 'paid', 'refunded']).optional(),
      q: z.string().trim().max(60).optional(),
    })
    .parse(req.query);
  const filter: QueryFilter<OrderAttrs> = {};
  if (query.status) filter.status = query.status;
  if (query.payment) filter.paymentStatus = query.payment;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [
      { orderNumber: pattern },
      { 'shippingAddress.phone': pattern },
      { 'shippingAddress.fullName': pattern },
    ];
  }
  const [items, total, statusCounts] = await Promise.all([
    Order.find(filter)
      .select('-statusHistory -items.options')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    ...paginated(items, total, query.page, query.limit),
    stats: Object.fromEntries(statusCounts.map((row) => [row._id, row.count])),
  });
});

orderRouter.get('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await Order.findById(id).populate('user', 'name email phone').lean();
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ order, nextStatuses: ORDER_TRANSITIONS[order.status] });
});

orderRouter.patch('/:id/status', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = z
    .object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() })
    .parse(req.body);
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  const updated = await changeOrderStatus(order, body.status, body.note);
  res.json({ order: updated, nextStatuses: ORDER_TRANSITIONS[updated.status] });
});

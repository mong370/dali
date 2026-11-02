import { Router } from 'express';
import type { QueryFilter } from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { escapeRegex, idParams, paginated, paginationQuery, parsePatch } from '../../lib/helpers.js';
import { currentUser, requireAdmin } from '../../middleware/auth.js';
import { password } from '../auth/auth.routes.js';
import { hashPassword, revokeAllSessions } from '../auth/auth.service.js';
import { Cart } from '../cart/cart.model.js';
import { Order } from '../orders/order.model.js';
import { Product } from '../products/product.model.js';
import { Review } from '../reviews/review.model.js';
import { User, type UserAttrs } from '../users/user.model.js';
import { phone } from '../users/user.routes.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/dashboard', async (_req, res) => {
  const [statusCounts, sales, customers, products, lowStock, recentOrders] =
    await Promise.all([
      Order.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ revenue: number; orders: number }>([
        { $match: { status: { $nin: ['cancelled', 'returned'] } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ status: 'active' }),
      Product.find({ totalStock: { $lte: 5 } })
        .select('name slug totalStock images')
        .sort({ totalStock: 1 })
        .limit(8)
        .lean(),
      Order.find()
        .select('orderNumber total status createdAt shippingAddress.fullName')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

  const totals = sales[0];
  res.json({
    revenue: totals?.revenue ?? 0,
    orders: totals?.orders ?? 0,
    customers,
    products,
    ordersByStatus: Object.fromEntries(statusCounts.map((row) => [row._id, row.count])),
    lowStock,
    recentOrders,
  });
});

const USER_FIELDS = 'name email phone role isActive isBanned banReason createdAt';
const NOT_BANNED = { isBanned: { $ne: true } };

const userBody = z.object({
  name: z.string().trim().min(2, 'Please enter the name').max(80),
  email: z.email('Enter a valid email').transform((value) => value.toLowerCase().trim()),
  // An empty value clears the number.
  phone: z.union([phone, z.literal('')]).default(''),
  role: z.enum(['customer', 'admin']).default('customer'),
  password,
});

const userUpdateBody = userBody.extend({
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().trim().min(3, 'Please give a reason for the ban').max(300).optional(),
});

adminRouter.get('/users', async (req, res) => {
  const query = paginationQuery
    .extend({
      q: z.string().trim().max(100).optional(),
      role: z.enum(['customer', 'admin']).optional(),
      status: z.enum(['active', 'disabled', 'banned']).optional(),
    })
    .parse(req.query);
  const filter: QueryFilter<UserAttrs> = {};
  if (query.role) filter.role = query.role;
  if (query.status === 'active') Object.assign(filter, NOT_BANNED, { isActive: true });
  if (query.status === 'disabled') Object.assign(filter, NOT_BANNED, { isActive: false });
  if (query.status === 'banned') filter.isBanned = true;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }
  const [users, total, all, customers, admins, disabled, banned] = await Promise.all([
    User.find(filter)
      .select(USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    User.countDocuments(filter),
    User.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ ...NOT_BANNED, isActive: false }),
    User.countDocuments({ isBanned: true }),
  ]);
  const orderCounts = await Order.aggregate<{ _id: unknown; count: number }>([
    { $match: { user: { $in: users.map((user) => user._id) } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const ordersByUser = new Map(orderCounts.map((row) => [String(row._id), row.count]));
  const items = users.map((user) => ({ ...user, orderCount: ordersByUser.get(String(user._id)) ?? 0 }));
  res.json({
    ...paginated(items, total, query.page, query.limit),
    stats: { all, customers, admins, active: all - disabled - banned, disabled, banned },
  });
});

adminRouter.get('/users/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const user = await User.findById(id).select(USER_FIELDS).lean();
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user });
});

adminRouter.post('/users', async (req, res) => {
  const { password: plain, phone: number, ...input } = userBody.parse(req.body);
  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  const user = await User.create({
    ...input,
    ...(number && { phone: number }),
    passwordHash: await hashPassword(plain),
  });
  res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = parsePatch(userUpdateBody, req.body);
  const isSelf = id === currentUser(req).id;
  // Admins can never lock themselves out, which also means one admin always remains.
  if (isSelf && (body.role !== undefined || body.isActive !== undefined || body.isBanned !== undefined)) {
    throw ApiError.badRequest('You cannot change your own role or status');
  }
  if (isSelf && body.password) {
    throw ApiError.badRequest('Change your own password from My account');
  }
  if (body.isBanned && !body.banReason) throw ApiError.badRequest('Please give a reason for the ban');

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (body.email && body.email !== user.email && (await User.exists({ email: body.email }))) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  if (body.name !== undefined) user.name = body.name;
  if (body.email !== undefined) user.email = body.email;
  if (body.phone !== undefined) user.phone = body.phone || undefined;
  if (body.role !== undefined) user.role = body.role;
  if (body.isActive !== undefined) user.isActive = body.isActive;
  if (body.isBanned !== undefined) {
    user.isBanned = body.isBanned;
    user.banReason = body.isBanned ? body.banReason : undefined;
  }
  if (body.password) user.passwordHash = await hashPassword(body.password);
  const roleChanged = user.isModified('role');
  await user.save();

  const locksOut = body.isActive === false || body.isBanned === true;
  if (locksOut || roleChanged || body.password) await revokeAllSessions(user._id);
  res.json({ user: await User.findById(id).select(USER_FIELDS).lean() });
});

adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  if (id === currentUser(req).id) throw ApiError.badRequest('You cannot delete your own account');
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  await revokeAllSessions(user._id);
  await Cart.deleteOne({ user: user._id });
  // Orders stay as business records with their delivery snapshot. Reviews stay, without the name.
  await Review.updateMany({ user: user._id }, { userName: 'Former customer' });
  await User.deleteOne({ _id: user._id });
  res.status(204).end();
});

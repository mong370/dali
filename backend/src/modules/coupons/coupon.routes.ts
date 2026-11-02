import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { idParams, parsePatch } from '../../lib/helpers.js';
import { requireAdmin } from '../../middleware/auth.js';
import { Coupon } from './coupon.model.js';

const body = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40),
  description: z.string().trim().max(200).default(''),
  type: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).default(0),
  minSubtotal: z.number().int().min(0).default(0),
  firstOrderOnly: z.boolean().default(false),
  usageLimit: z.number().int().min(0).default(0),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const couponRouter = Router();
couponRouter.use(requireAdmin);

couponRouter.get('/', async (_req, res) => {
  res.json({ items: await Coupon.find().sort({ createdAt: -1 }).lean() });
});

couponRouter.post('/', async (req, res) => {
  const input = body.parse(req.body);
  if (input.type === 'percent' && input.value > 100) {
    throw ApiError.badRequest('A percentage discount cannot exceed 100');
  }
  res.status(201).json({ coupon: await Coupon.create(input) });
});

couponRouter.patch('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const coupon = await Coupon.findById(id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  coupon.set(parsePatch(body, req.body));
  if (coupon.type === 'percent' && coupon.value > 100) {
    throw ApiError.badRequest('A percentage discount cannot exceed 100');
  }
  await coupon.save();
  res.json({ coupon });
});

couponRouter.delete('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  await Coupon.deleteOne({ _id: id });
  res.status(204).end();
});

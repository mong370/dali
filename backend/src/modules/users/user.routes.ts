import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { DISTRICTS } from '../../lib/districts.js';
import { objectId } from '../../lib/helpers.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { password } from '../auth/auth.routes.js';
import { hashPassword, publicUser, revokeAllSessions } from '../auth/auth.service.js';
import { Product } from '../products/product.model.js';
import { User } from './user.model.js';

export const phone = z
  .string()
  .trim()
  .regex(/^(\+?88)?01[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number, e.g. 01712345678');

export const addressBody = z.object({
  label: z.string().trim().max(30).default('Home'),
  fullName: z.string().trim().min(2, 'Please enter the full name').max(80),
  phone,
  district: z.enum(DISTRICTS, 'Please choose a district'),
  area: z.string().trim().min(2, 'Please enter the area').max(80),
  line1: z.string().trim().min(5, 'Please enter the full address').max(200),
  isDefault: z.boolean().default(false),
});

async function loadUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw ApiError.unauthorized();
  return user;
}

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/me', async (req, res) => {
  res.json({ user: publicUser(await loadUser(currentUser(req).id)) });
});

userRouter.patch('/me', async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: phone.optional(),
    })
    .parse(req.body);
  const user = await loadUser(currentUser(req).id);
  user.set(body);
  await user.save();
  res.json({ user: publicUser(user) });
});

userRouter.post('/me/password', async (req, res) => {
  const body = z
    .object({ currentPassword: z.string().min(1).max(72), newPassword: password })
    .parse(req.body);
  const user = await User.findById(currentUser(req).id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Your current password is incorrect', 'INVALID_PASSWORD');
  }
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  await revokeAllSessions(user._id);
  res.json({ message: 'Password updated. Please sign in again.' });
});

userRouter.post('/me/addresses', async (req, res) => {
  const body = addressBody.parse(req.body);
  const user = await loadUser(currentUser(req).id);
  if (user.addresses.length >= 10) throw ApiError.badRequest('You can save up to 10 addresses');
  if (body.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((address) => (address.isDefault = false));
    body.isDefault = true;
  }
  user.addresses.push(body);
  await user.save();
  res.status(201).json({ user: publicUser(user) });
});

userRouter.patch('/me/addresses/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const body = addressBody.parse(req.body);
  const user = await loadUser(currentUser(req).id);
  const address = user.addresses.id(id);
  if (!address) throw ApiError.notFound('Address not found');
  if (body.isDefault) user.addresses.forEach((other) => (other.isDefault = false));
  address.set(body);
  await user.save();
  res.json({ user: publicUser(user) });
});

userRouter.delete('/me/addresses/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const user = await loadUser(currentUser(req).id);
  const address = user.addresses.id(id);
  if (!address) throw ApiError.notFound('Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  const first = user.addresses[0];
  if (wasDefault && first) first.isDefault = true;
  await user.save();
  res.json({ user: publicUser(user) });
});

userRouter.get('/me/wishlist', async (req, res) => {
  const user = await loadUser(currentUser(req).id);
  const items = await Product.find({ _id: { $in: user.wishlist }, status: 'active' })
    .select('-description -attributes -tags')
    .lean();
  res.json({ ids: user.wishlist, items });
});

userRouter.put('/me/wishlist/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  if (!(await Product.exists({ _id: id }))) throw ApiError.notFound('Product not found');
  const user = await User.findByIdAndUpdate(
    currentUser(req).id,
    { $addToSet: { wishlist: id } },
    { returnDocument: 'after' },
  );
  res.json({ ids: user?.wishlist ?? [] });
});

userRouter.delete('/me/wishlist/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const user = await User.findByIdAndUpdate(
    currentUser(req).id,
    { $pull: { wishlist: id } },
    { returnDocument: 'after' },
  );
  res.json({ ids: user?.wishlist ?? [] });
});

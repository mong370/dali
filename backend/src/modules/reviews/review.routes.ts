import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { idParams, objectId, paginated, paginationQuery, toObjectId } from '../../lib/helpers.js';
import { currentUser, requireAdmin, requireAuth } from '../../middleware/auth.js';
import { Order } from '../orders/order.model.js';
import { Product } from '../products/product.model.js';
import { User } from '../users/user.model.js';
import { Review } from './review.model.js';

async function refreshProductRating(productId: string) {
  const [stats] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { product: toObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { ratingAvg: Math.round((stats?.avg ?? 0) * 10) / 10, ratingCount: stats?.count ?? 0 },
  );
}

export const reviewRouter = Router();

reviewRouter.get('/product/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { page, limit } = paginationQuery.parse(req.query);
  const [items, total] = await Promise.all([
    Review.find({ product: id })
      .select('-user')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments({ product: id }),
  ]);
  res.json(paginated(items, total, page, limit));
});

// Creating again replaces the customer's earlier review of the product.
reviewRouter.post('/', requireAuth, async (req, res) => {
  const body = z
    .object({
      product: objectId,
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().max(2000).default(''),
    })
    .parse(req.body);
  const { id: userId } = currentUser(req);

  const purchased = await Order.exists({
    user: userId,
    status: 'delivered',
    'items.product': body.product,
  });
  if (!purchased) {
    throw ApiError.forbidden('You can review a product after it has been delivered to you');
  }

  const user = await User.findById(userId).select('name').lean();
  const review = await Review.findOneAndUpdate(
    { product: body.product, user: userId },
    { rating: body.rating, comment: body.comment, userName: user?.name ?? 'Customer' },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await refreshProductRating(body.product);
  res.status(201).json({ review });
});

reviewRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const review = await Review.findByIdAndDelete(id);
  if (review) await refreshProductRating(String(review.product));
  res.status(204).end();
});

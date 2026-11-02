import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { idParams, parsePatch } from '../../lib/helpers.js';
import { optionalAuth, requireAdmin } from '../../middleware/auth.js';
import { Category } from '../categories/category.model.js';
import { Product, PRODUCT_SECTIONS } from '../products/product.model.js';
import { User } from '../users/user.model.js';
import { Banner } from './content.model.js';

const CARD_FIELDS = '-description -attributes -tags -variants.sku';

const bySection = (section: (typeof PRODUCT_SECTIONS)[number], limit: number) =>
  Product.find({ status: 'active', sections: section })
    .select(CARD_FIELDS)
    .sort({ soldCount: -1, _id: 1 })
    .limit(limit)
    .lean();

/** Prefers categories the customer has wishlisted; otherwise uses the merchandised list. */
async function forYou(userId: string | undefined) {
  const limit = 6;
  if (userId) {
    const user = await User.findById(userId).select('wishlist').lean();
    if (user?.wishlist.length) {
      const categories = await Product.distinct('category', { _id: { $in: user.wishlist } });
      const items = await Product.find({
        status: 'active',
        category: { $in: categories },
        _id: { $nin: user.wishlist },
      })
        .select(CARD_FIELDS)
        .sort({ soldCount: -1, _id: 1 })
        .limit(limit)
        .lean();
      if (items.length === limit) return items;
    }
  }
  return bySection('for-you', limit);
}

/** Up to four chosen categories, each with its best sellers, subcategories included. */
async function categoryShowcases() {
  const categories = await Category.find({ homeShowcase: true, isActive: true })
    .select('name slug')
    .sort({ sortOrder: 1, name: 1 })
    .limit(4)
    .lean();
  const showcases = await Promise.all(
    categories.map(async (category) => {
      const descendants = await Category.find({ ancestors: category._id }).select('_id').lean();
      const products = await Product.find({
        status: 'active',
        category: { $in: [category._id, ...descendants.map((item) => item._id)] },
      })
        .select(CARD_FIELDS)
        .sort({ soldCount: -1, _id: 1 })
        .limit(4)
        .lean();
      return { category: { name: category.name, slug: category.slug }, products };
    }),
  );
  return showcases.filter((showcase) => showcase.products.length > 0);
}

export const contentRouter = Router();

contentRouter.get('/home', optionalAuth, async (req, res) => {
  const [
    categories,
    navCategories,
    heroBanners,
    showcases,
    customerFavorites,
    recommended,
    trending,
    bestDeal,
    firstOrderDeal,
    featured,
  ] = await Promise.all([
    Category.find({ parent: null, isActive: true }).sort({ sortOrder: 1 }).lean(),
    Category.find({ showInNav: true, isActive: true }).sort({ sortOrder: 1 }).lean(),
    Banner.find({ placement: 'hero', isActive: true }).sort({ sortOrder: 1 }).lean(),
    categoryShowcases(),
    bySection('customer-favorites', 6),
    forYou(req.user?.id),
    bySection('trending', 6),
    bySection('best-deal', 6),
    bySection('first-order-deal', 7),
    bySection('featured', 7),
  ]);
  res.json({
    categories,
    navCategories,
    heroBanners,
    categoryShowcases: showcases,
    sections: { customerFavorites, forYou: recommended, trending, bestDeal, firstOrderDeal, featured },
  });
});

const bannerBody = z.object({
  placement: z.enum(['hero']).default('hero'),
  eyebrow: z.string().trim().max(80).default(''),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).default(''),
  image: z.string().min(1, 'An image is required').max(500),
  link: z.string().trim().max(300).default('/products'),
  cta: z.string().trim().max(40).default('Shop now'),
  fromPrice: z.number().int().min(0).default(0),
  dark: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

contentRouter.get('/banners', requireAdmin, async (_req, res) => {
  res.json({ items: await Banner.find().sort({ placement: 1, sortOrder: 1 }).lean() });
});
contentRouter.post('/banners', requireAdmin, async (req, res) => {
  res.status(201).json({ banner: await Banner.create(bannerBody.parse(req.body)) });
});
contentRouter.patch('/banners/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const banner = await Banner.findByIdAndUpdate(id, parsePatch(bannerBody, req.body), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!banner) throw ApiError.notFound('Banner not found');
  res.json({ banner });
});
contentRouter.delete('/banners/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  await Banner.deleteOne({ _id: id });
  res.status(204).end();
});

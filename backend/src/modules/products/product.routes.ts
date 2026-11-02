import { Router } from 'express';
import type { QueryFilter, SortOrder } from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import {
  escapeRegex,
  idParams,
  objectId,
  paginated,
  paginationQuery,
  parsePatch,
  randomSuffix,
  slugify,
} from '../../lib/helpers.js';
import { requireAdmin } from '../../middleware/auth.js';
import { Category } from '../categories/category.model.js';
import { categoryIdsForSlug } from '../categories/category.routes.js';
import { PRODUCT_SECTIONS, Product, type ProductAttrs } from './product.model.js';
import { productBody, productQuery } from './product.schemas.js';

const LOW_STOCK = 5;
const LIST_FIELDS = '-description -attributes -tags -variants.sku';

const SORTS: Record<string, Record<string, SortOrder>> = {
  relevance: { soldCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  'price-asc': { priceMin: 1, _id: 1 },
  'price-desc': { priceMin: -1, _id: 1 },
  rating: { ratingAvg: -1, ratingCount: -1, _id: 1 },
  popular: { soldCount: -1, _id: 1 },
  discount: { discountPercent: -1, _id: 1 },
};

async function uniqueSlug(name: string) {
  const slug = slugify(name) || 'product';
  return (await Product.exists({ slug })) ? `${slug}-${randomSuffix()}` : slug;
}

function textFilter(q: string) {
  const pattern = new RegExp(escapeRegex(q), 'i');
  return { $or: [{ name: pattern }, { brand: pattern }, { tags: pattern }] };
}

export const productRouter = Router();

productRouter.get('/', async (req, res) => {
  const query = productQuery.parse(req.query);
  const base: QueryFilter<ProductAttrs> = { status: 'active' };

  if (query.q) Object.assign(base, textFilter(query.q));
  if (query.section) base.sections = query.section;
  if (query.category) {
    const ids = await categoryIdsForSlug(query.category);
    if (!ids) throw ApiError.notFound('Category not found');
    base.category = { $in: ids };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    base.priceMin = {
      ...(query.minPrice !== undefined && { $gte: query.minPrice }),
      ...(query.maxPrice !== undefined && { $lte: query.maxPrice }),
    };
  }
  if (query.rating) base.ratingAvg = { $gte: query.rating };
  if (query.inStock) base.totalStock = { $gt: 0 };
  if (query.onSale) base.discountPercent = { $gt: 0 };

  // Brand counts ignore the brand filter, so customers can select several brands.
  const filter: QueryFilter<ProductAttrs> = { ...base };
  if (query.brand) filter.brand = { $in: query.brand.split(',').map((brand) => brand.trim()) };

  const [items, total, brands] = await Promise.all([
    Product.find(filter)
      .select(LIST_FIELDS)
      .sort(SORTS[query.sort] ?? {})
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Product.countDocuments(filter),
    Product.aggregate<{ name: string; count: number }>([
      { $match: { ...base, brand: { $ne: '' } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
      { $sort: { count: -1, name: 1 } },
      { $limit: 30 },
    ]),
  ]);

  res.json({ ...paginated(items, total, query.page, query.limit), facets: { brands } });
});

productRouter.get('/suggest', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(2).max(100) }).parse(req.query);
  const items = await Product.find({ status: 'active', ...textFilter(q) })
    .select('name slug images priceMin')
    .sort({ soldCount: -1 })
    .limit(8)
    .lean();
  res.json({ items });
});

const ADMIN_SORTS: Record<string, Record<string, SortOrder>> = {
  newest: { createdAt: -1, _id: 1 },
  name: { name: 1, _id: 1 },
  'price-asc': { priceMin: 1, _id: 1 },
  'price-desc': { priceMin: -1, _id: 1 },
  'stock-asc': { totalStock: 1, _id: 1 },
};

productRouter.get('/admin/list', requireAdmin, async (req, res) => {
  const query = paginationQuery
    .extend({
      q: z.string().trim().max(100).optional(),
      status: z.enum(['active', 'draft']).optional(),
      stock: z.enum(['in', 'low', 'out']).optional(),
      section: z.enum(PRODUCT_SECTIONS).optional(),
      category: objectId.optional(),
      sort: z.enum(['newest', 'name', 'price-asc', 'price-desc', 'stock-asc']).default('newest'),
    })
    .parse(req.query);

  const filter: QueryFilter<ProductAttrs> = query.q ? textFilter(query.q) : {};
  if (query.status) filter.status = query.status;
  if (query.section) filter.sections = query.section;
  if (query.stock === 'in') filter.totalStock = { $gt: LOW_STOCK };
  if (query.stock === 'low') filter.totalStock = { $gt: 0, $lte: LOW_STOCK };
  if (query.stock === 'out') filter.totalStock = 0;
  if (query.category) {
    const descendants = await Category.find({ ancestors: query.category }).select('_id').lean();
    filter.category = { $in: [query.category, ...descendants.map((item) => item._id)] };
  }

  const [items, total, all, active, draft, low, out, featured] = await Promise.all([
    Product.find(filter)
      .select('name slug images brand priceMin priceMax totalStock status category sections')
      .populate('category', 'name')
      .sort(ADMIN_SORTS[query.sort] ?? {})
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Product.countDocuments(filter),
    Product.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'draft' }),
    Product.countDocuments({ totalStock: { $gt: 0, $lte: LOW_STOCK } }),
    Product.countDocuments({ totalStock: 0 }),
    Product.countDocuments({ sections: 'featured' }),
  ]);
  res.json({
    ...paginated(items, total, query.page, query.limit),
    stats: { all, active, draft, low, out, featured },
  });
});

productRouter.get('/admin/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ product });
});

productRouter.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, status: 'active' }).lean();
  if (!product) throw ApiError.notFound('Product not found');

  const category = await Category.findById(product.category).lean();
  const breadcrumb = category
    ? [
        ...(await Category.find({ _id: { $in: category.ancestors } })
          .select('name slug ancestors')
          .lean()).sort((a, b) => a.ancestors.length - b.ancestors.length),
        category,
      ].map(({ name, slug }) => ({ name, slug }))
    : [];

  const related = await Product.find({
    status: 'active',
    category: product.category,
    _id: { $ne: product._id },
  })
    .select(LIST_FIELDS)
    .sort({ soldCount: -1 })
    .limit(6)
    .lean();

  res.json({ product, breadcrumb, related });
});

productRouter.post('/', requireAdmin, async (req, res) => {
  const input = productBody.parse(req.body);
  if (!(await Category.exists({ _id: input.category }))) {
    throw ApiError.badRequest('Category not found');
  }
  const product = await Product.create({ ...input, slug: await uniqueSlug(input.name) });
  res.status(201).json({ product });
});

productRouter.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const input = parsePatch(productBody, req.body);
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  if (input.category && !(await Category.exists({ _id: input.category }))) {
    throw ApiError.badRequest('Category not found');
  }
  product.set(input);
  await product.save();
  res.json({ product });
});

productRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  // Orders keep their own snapshot of each item, so past orders are unaffected.
  await Product.deleteOne({ _id: id });
  res.status(204).end();
});

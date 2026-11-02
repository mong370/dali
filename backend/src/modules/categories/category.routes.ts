import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/ApiError.js';
import { idParams, objectId, parsePatch, randomSuffix, slugify } from '../../lib/helpers.js';
import { requireAdmin } from '../../middleware/auth.js';
import { Product } from '../products/product.model.js';
import { Category } from './category.model.js';

const body = z.object({
  name: z.string().trim().min(2).max(80),
  parent: objectId.nullable().default(null),
  icon: z.string().trim().max(16).default('🛍️'),
  // Replaces the emoji when set; null removes it.
  image: z.string().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  showInNav: z.boolean().default(false),
  homeShowcase: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

async function ancestorsOf(parentId: string | null) {
  if (!parentId) return [];
  const parent = await Category.findById(parentId);
  if (!parent) throw ApiError.badRequest('Parent category not found');
  return [...parent.ancestors, parent._id];
}

/** Returns a category id plus every descendant id, for catalogue filtering. */
export async function categoryIdsForSlug(slug: string) {
  const category = await Category.findOne({ slug }).select('_id').lean();
  if (!category) return null;
  const descendants = await Category.find({ ancestors: category._id }).select('_id').lean();
  return [category._id, ...descendants.map((item) => item._id)];
}

export const categoryRouter = Router();

categoryRouter.get('/', async (_req, res) => {
  const items = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ items });
});

// Every category, hidden ones included, with product counts that cover subcategories.
categoryRouter.get('/admin/list', requireAdmin, async (_req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const own = new Map(counts.map((row) => [String(row._id), row.count]));
  const items = categories.map((category) => {
    const id = String(category._id);
    const inChildren = categories
      .filter((other) => other.ancestors.some((ancestor) => String(ancestor) === id))
      .reduce((sum, other) => sum + (own.get(String(other._id)) ?? 0), 0);
    return { ...category, productCount: (own.get(id) ?? 0) + inChildren };
  });
  res.json({ items });
});

categoryRouter.post('/', requireAdmin, async (req, res) => {
  const input = body.parse(req.body);
  const slug = slugify(input.name);
  const category = await Category.create({
    ...input,
    slug: (await Category.exists({ slug })) ? `${slug}-${randomSuffix()}` : slug,
    ancestors: await ancestorsOf(input.parent),
  });
  res.status(201).json({ category });
});

categoryRouter.patch('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const input = parsePatch(body, req.body);
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');

  const parentChanged =
    input.parent !== undefined && String(input.parent) !== String(category.parent);
  if (parentChanged && input.parent) {
    const invalid =
      input.parent === id || (await Category.exists({ _id: input.parent, ancestors: id }));
    if (invalid) throw ApiError.badRequest('A category cannot be moved inside itself');
  }

  category.set(input);
  if (parentChanged) category.ancestors = await ancestorsOf(input.parent ?? null);
  await category.save();

  if (parentChanged) {
    // Parents sort before children by depth, so each child sees an up-to-date parent.
    const descendants = await Category.find({ ancestors: category._id });
    descendants.sort((a, b) => a.ancestors.length - b.ancestors.length);
    for (const child of descendants) {
      child.ancestors = await ancestorsOf(String(child.parent));
      await child.save();
    }
  }
  res.json({ category });
});

categoryRouter.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = idParams.parse(req.params);
  if (await Category.exists({ parent: id })) {
    throw ApiError.conflict('Move or delete its subcategories first', 'HAS_CHILDREN');
  }
  if (await Product.exists({ category: id })) {
    throw ApiError.conflict('Move or delete its products first', 'HAS_PRODUCTS');
  }
  await Category.deleteOne({ _id: id });
  res.status(204).end();
});

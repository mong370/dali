import { z } from 'zod';
import { objectId, paginationQuery } from '../../lib/helpers.js';
import { PRODUCT_SECTIONS } from './product.model.js';

const variant = z.object({
  _id: objectId.optional(),
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  options: z.record(z.string(), z.string().max(60)).default({}),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(0),
});

export const productBody = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  description: z.string().max(10000).default(''),
  brand: z.string().trim().max(80).default(''),
  category: objectId,
  images: z.array(z.string().max(500)).max(10).default([]),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  attributes: z
    .array(z.object({ name: z.string().trim().min(1).max(60), value: z.string().trim().max(200) }))
    .max(40)
    .default([]),
  variants: z
    .array(variant)
    .min(1, 'Add at least one variant')
    .max(100)
    .refine(
      (variants) => new Set(variants.map((item) => item.sku)).size === variants.length,
      'Each variant needs a different SKU',
    ),
  minOrderQty: z.number().int().min(1).default(1),
  sections: z.array(z.enum(PRODUCT_SECTIONS)).default([]),
  status: z.enum(['draft', 'active']).default('active'),
});

const flag = z.enum(['true', 'false']).transform((value) => value === 'true');

export const productQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(300).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: flag.optional(),
  onSale: flag.optional(),
  section: z.enum(PRODUCT_SECTIONS).optional(),
  sort: z
    .enum(['relevance', 'newest', 'price-asc', 'price-desc', 'rating', 'popular', 'discount'])
    .default('relevance'),
});

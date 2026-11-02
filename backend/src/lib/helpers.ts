import { randomBytes, createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

/**
 * Validates an update. Keeps only the fields actually sent, because Zod applies
 * `.default()` values even under `.partial()`, which would reset everything else.
 */
export function parsePatch<T extends z.ZodObject>(schema: T, input: unknown) {
  const parsed = schema.partial().parse(input) as Record<string, unknown>;
  const sent = Object.keys(input as object);
  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => sent.includes(key)),
  ) as Partial<z.output<T>>;
}

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const randomSuffix = (bytes = 3) => randomBytes(bytes).toString('hex');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const toObjectId = (id: string) => new Types.ObjectId(id);

import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';
import { slugify } from '../lib/helpers.js';
// Imported for their side effect of registering the models that get cleared.
import '../modules/auth/refreshToken.model.js';
import '../modules/cart/cart.model.js';
import '../modules/orders/order.model.js';
import '../modules/reviews/review.model.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { Category } from '../modules/categories/category.model.js';
import { Banner } from '../modules/content/content.model.js';
import { Coupon } from '../modules/coupons/coupon.model.js';
import { Product } from '../modules/products/product.model.js';
import { User } from '../modules/users/user.model.js';
import { artSvg, saveArt } from './art.js';
import { CATEGORIES, HERO_BANNERS, PRODUCTS, type SeedProduct } from './data.js';

const toPoisha = (taka: number) => Math.round(taka * 100);

async function seedCategories() {
  const ids = new Map<string, mongoose.Types.ObjectId>();
  for (const [index, top] of CATEGORIES.entries()) {
    const parent = await Category.create({
      name: top.name,
      slug: slugify(top.key),
      icon: top.icon,
      sortOrder: index,
      homeShowcase: top.homeShowcase ?? false,
    });
    ids.set(top.key, parent._id);
    for (const [childIndex, child] of (top.children ?? []).entries()) {
      const created = await Category.create({
        name: child.name,
        slug: slugify(child.key),
        icon: child.icon,
        parent: parent._id,
        ancestors: [parent._id],
        sortOrder: child.sort ?? childIndex + 10,
        showInNav: child.showInNav ?? false,
      });
      ids.set(child.key, created._id);
    }
  }
  return ids;
}

function variantsFor(product: SeedProduct, sku: string) {
  const stock = product.stock ?? 40;
  if (!product.option) {
    return [
      {
        sku,
        options: {},
        price: toPoisha(product.price),
        compareAtPrice: product.compareAt ? toPoisha(product.compareAt) : undefined,
        stock,
      },
    ];
  }
  const { name, values, step = 0 } = product.option;
  return values.map((value, index) => ({
    sku: `${sku}-${index + 1}`,
    options: { [name]: value },
    price: toPoisha(product.price + step * index),
    compareAtPrice: product.compareAt ? toPoisha(product.compareAt + step * index) : undefined,
    stock,
  }));
}

function descriptionFor(product: SeedProduct) {
  return `${product.name} from ${product.brand}, selected by the Dali team for everyday value. Delivered to your door with cash on delivery and easy returns.`;
}

async function seedProducts(categoryIds: Map<string, mongoose.Types.ObjectId>) {
  for (const [index, product] of PRODUCTS.entries()) {
    const category = categoryIds.get(product.category);
    if (!category) throw new Error(`Unknown seed category: ${product.category}`);
    const slug = `${slugify(product.name)}-${index + 1}`;
    const [from, to] = product.colors;
    const images = [
      await saveArt(`p-${index}-a`, artSvg([product.emoji], from, to, 600, 600)),
      await saveArt(`p-${index}-b`, artSvg([product.emoji], to, from, 600, 600)),
    ];
    await Product.create({
      name: product.name,
      slug,
      brand: product.brand,
      description: descriptionFor(product),
      category,
      images,
      tags: [product.category],
      attributes: Object.entries(product.attributes ?? {}).map(([name, value]) => ({ name, value })),
      variants: variantsFor(product, `DL-${String(index + 1).padStart(4, '0')}`),
      minOrderQty: product.minOrderQty ?? 1,
      sections: product.sections ?? [],
      // Fixed, not random, so the demo looks the same after every seed.
      soldCount: (PRODUCTS.length - index) * 3,
    });
  }
}

async function seedContent() {
  for (const [index, banner] of HERO_BANNERS.entries()) {
    const [from, to] = banner.colors;
    await Banner.create({
      placement: 'hero',
      eyebrow: banner.eyebrow,
      title: banner.title,
      link: banner.link,
      fromPrice: toPoisha(banner.fromPrice),
      dark: banner.dark,
      sortOrder: index,
      image: await saveArt(`hero-${banner.key}`, artSvg(banner.emojis, from, to, 600, 800)),
    });
  }

  await Coupon.create([
    {
      code: 'WELCOME10',
      description: '10% off your first order, up to ৳500',
      type: 'percent',
      value: 10,
      maxDiscount: toPoisha(500),
      firstOrderOnly: true,
    },
    {
      code: 'FREESHIP',
      description: 'Free shipping on your first order, up to ৳200',
      type: 'free_shipping',
      maxDiscount: toPoisha(200),
      firstOrderOnly: true,
    },
  ]);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env');
  await User.create({
    name: 'Dali Admin',
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
  });
  return email;
}

async function main() {
  // The seed erases every collection, so production needs an explicit opt-in.
  if (isProd && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production without ALLOW_SEED=true: it erases all data');
  }

  await connectDb(env.MONGO_URI);

  // Products and accounts cannot be recovered once erased, so never wipe them by default.
  const existing = (await Product.countDocuments()) + (await User.countDocuments());
  if (existing > 0 && process.env.SEED_RESET !== 'true') {
    throw new Error(
      `Refusing to seed: the database already holds ${existing} products and users. ` +
        'Back it up, then set SEED_RESET=true to erase everything.',
    );
  }

  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).deleteMany({})));
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));

  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedContent();
  const adminEmail = await seedAdmin();

  logger.info(
    { categories: categoryIds.size, products: PRODUCTS.length, adminEmail },
    'Seed complete',
  );
}

main()
  .catch((err) => {
    logger.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());

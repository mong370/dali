import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { Category } from '../modules/categories/category.model.js';
import { Product } from '../modules/products/product.model.js';
import { User } from '../modules/users/user.model.js';

export const app = createApp();
export const api = () => request(app);

export async function setupDb() {
  // A safeguard: these tests delete everything in the database they connect to.
  if (!env.MONGO_URI.includes('test')) throw new Error('Tests must use a test database');
  await connectDb(env.MONGO_URI);
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
}

export async function clearDb() {
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).deleteMany({})));
}

export const teardownDb = disconnectDb;

let counter = 0;

export async function registerCustomer() {
  counter += 1;
  const email = `customer${counter}@example.com`;
  const response = await api()
    .post('/api/v1/auth/register')
    .send({ name: 'Test Customer', email, password: 'password123' })
    .expect(201);
  return {
    email,
    id: response.body.user.id as string,
    token: response.body.accessToken as string,
    cookie: response.headers['set-cookie'] as unknown as string[],
  };
}

export async function createAdmin() {
  counter += 1;
  const email = `admin${counter}@example.com`;
  await User.create({
    name: 'Admin',
    email,
    passwordHash: await hashPassword('password123'),
    role: 'admin',
  });
  const response = await api()
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' })
    .expect(200);
  return { token: response.body.accessToken as string };
}

export async function createCategory(name = 'Fashion', parent?: mongoose.Types.ObjectId) {
  counter += 1;
  return Category.create({
    name,
    slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${counter}`,
    parent: parent ?? null,
    ancestors: parent ? [parent] : [],
  });
}

export async function createProduct(
  overrides: Partial<{
    name: string;
    brand: string;
    price: number;
    compareAtPrice: number;
    stock: number;
    minOrderQty: number;
    category: mongoose.Types.ObjectId;
    status: 'draft' | 'active';
  }> = {},
) {
  counter += 1;
  const category = overrides.category ?? (await createCategory())._id;
  return Product.create({
    name: overrides.name ?? `Product ${counter}`,
    slug: `product-${counter}`,
    brand: overrides.brand ?? 'Brand',
    category,
    status: overrides.status ?? 'active',
    minOrderQty: overrides.minOrderQty ?? 1,
    variants: [
      {
        sku: `SKU-${counter}`,
        price: overrides.price ?? 100_00,
        compareAtPrice: overrides.compareAtPrice,
        stock: overrides.stock ?? 10,
      },
    ],
  });
}

export const ADDRESS = {
  fullName: 'Test Customer',
  phone: '01712345678',
  district: 'Dhaka',
  area: 'Gulshan',
  line1: 'House 1, Road 2',
};

export const lineFor = (product: Awaited<ReturnType<typeof createProduct>>, quantity = 1) => ({
  product: String(product._id),
  variant: String(product.variants[0]!._id),
  quantity,
});

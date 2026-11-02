import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../modules/products/product.model.js';
import {
  api,
  clearDb,
  createAdmin,
  createCategory,
  createProduct,
  setupDb,
  teardownDb,
} from './helpers.js';

describe('products', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  it('derives price, stock and discount from variants', async () => {
    const category = await createCategory();
    const product = await Product.create({
      name: 'Rice',
      slug: 'rice',
      category: category._id,
      variants: [
        { sku: 'R5', options: { Weight: '5 kg' }, price: 400_00, compareAtPrice: 500_00, stock: 3 },
        { sku: 'R10', options: { Weight: '10 kg' }, price: 750_00, compareAtPrice: 900_00, stock: 4 },
      ],
    });
    expect(product.priceMin).toBe(400_00);
    expect(product.priceMax).toBe(750_00);
    expect(product.totalStock).toBe(7);
    // Based on the cheapest variant alone: 400 was 500.
    expect(product.compareAtPrice).toBe(500_00);
    expect(product.discountPercent).toBe(20);
  });

  it('includes subcategories when filtering by a parent category', async () => {
    const parent = await createCategory('Fashion');
    const child = await createCategory('Shoes', parent._id);
    const other = await createCategory('Grocery');
    await createProduct({ name: 'Sneaker', category: child._id });
    await createProduct({ name: 'Rice', category: other._id });

    const response = await api().get(`/api/v1/products?category=${parent.slug}`).expect(200);
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(['Sneaker']);
  });

  it('filters, sorts and paginates', async () => {
    await createProduct({ name: 'Cheap', price: 10_00, brand: 'A' });
    await createProduct({ name: 'Middle', price: 50_00, brand: 'B' });
    await createProduct({ name: 'Costly', price: 90_00, brand: 'A', stock: 0 });

    const names = (body: { items: { name: string }[] }) => body.items.map((item) => item.name);
    const sorted = await api().get('/api/v1/products?sort=price-desc').expect(200);
    expect(names(sorted.body)).toEqual(['Costly', 'Middle', 'Cheap']);

    const ranged = await api().get('/api/v1/products?minPrice=2000&maxPrice=6000').expect(200);
    expect(names(ranged.body)).toEqual(['Middle']);

    const inStock = await api().get('/api/v1/products?inStock=true&brand=A').expect(200);
    expect(names(inStock.body)).toEqual(['Cheap']);
    // Brand counts ignore the selected brand, so other brands stay selectable.
    expect(inStock.body.facets.brands).toHaveLength(2);

    const paged = await api().get('/api/v1/products?limit=2&page=2&sort=price-asc').expect(200);
    expect(names(paged.body)).toEqual(['Costly']);
    expect(paged.body.pages).toBe(2);
  });

  it('treats search text literally rather than as a regular expression', async () => {
    await createProduct({ name: 'Plain Shirt' });
    const response = await api().get('/api/v1/products').query({ q: '.*' }).expect(200);
    expect(response.body.items).toHaveLength(0);
  });

  it('hides drafts from customers', async () => {
    const draft = await createProduct({ status: 'draft' });
    await api().get(`/api/v1/products/${draft.slug}`).expect(404);
    const list = await api().get('/api/v1/products').expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it('lets only admins create products, and recalculates on edit', async () => {
    const admin = await createAdmin();
    const category = await createCategory();
    const payload = {
      name: 'Blue Kettle',
      category: String(category._id),
      variants: [{ sku: 'K1', price: 100_00, stock: 5 }],
    };
    await api().post('/api/v1/products').send(payload).expect(401);
    const created = await api()
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(payload)
      .expect(201);
    expect(created.body.product.slug).toBe('blue-kettle');

    const edited = await api()
      .patch(`/api/v1/products/${created.body.product._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ variants: [{ sku: 'K1', price: 80_00, stock: 2 }] })
      .expect(200);
    expect(edited.body.product.priceMin).toBe(80_00);
    expect(edited.body.product.totalStock).toBe(2);
  });

  it('refuses duplicate SKUs within a product', async () => {
    const admin = await createAdmin();
    const category = await createCategory();
    await api()
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Duplicate',
        category: String(category._id),
        variants: [
          { sku: 'X', price: 1, stock: 1 },
          { sku: 'X', price: 1, stock: 1 },
        ],
      })
      .expect(422);
  });
});

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { RefreshToken } from '../modules/auth/refreshToken.model.js';
import { Cart } from '../modules/cart/cart.model.js';
import { Category } from '../modules/categories/category.model.js';
import { Coupon } from '../modules/coupons/coupon.model.js';
import { Product } from '../modules/products/product.model.js';
import { User } from '../modules/users/user.model.js';
import { detectFile } from '../modules/uploads/upload.routes.js';
import {
  api,
  clearDb,
  createAdmin,
  createCategory,
  createProduct,
  registerCustomer,
  setupDb,
  teardownDb,
} from './helpers.js';

describe('file detection', () => {
  const pad = Buffer.alloc(16);
  const withHead = (...bytes: number[]) => Buffer.concat([Buffer.from(bytes), pad]);

  it('recognises supported files from their bytes and sorts them by kind', () => {
    expect(detectFile(withHead(0xff, 0xd8, 0xff))).toMatchObject({ kind: 'images', extension: 'jpg' });
    expect(detectFile(withHead(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toMatchObject({ kind: 'images', extension: 'png' });
    expect(detectFile(Buffer.concat([Buffer.from('RIFF0000WEBP'), pad]))).toMatchObject({ kind: 'images', extension: 'webp' });
    expect(detectFile(Buffer.concat([Buffer.from('0000ftypisom'), pad]))).toMatchObject({ kind: 'videos', extension: 'mp4' });
    expect(detectFile(withHead(0x1a, 0x45, 0xdf, 0xa3))).toMatchObject({ kind: 'videos', extension: 'webm' });
    expect(detectFile(Buffer.concat([Buffer.from('%PDF-1.7'), pad]))).toMatchObject({ kind: 'documents', extension: 'pdf' });
    expect(detectFile(withHead(0x50, 0x4b, 0x03, 0x04), 'report.XLSX')).toMatchObject({ kind: 'documents', extension: 'xlsx' });
  });

  it('refuses anything that could carry scripts, whatever it is called', () => {
    expect(detectFile(Buffer.from('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(detectFile(Buffer.from('<html><script>alert(1)</script></html>'), 'photo.png')).toBeNull();
    expect(detectFile(Buffer.from('<?php echo 1; ?> padding'))).toBeNull();
    expect(detectFile(withHead(0x50, 0x4b, 0x03, 0x04), 'archive.zip')).toBeNull();
  });
});

describe('api', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  describe('file uploads', () => {
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const send = (token: string) => api().post('/api/v1/uploads').set('Authorization', `Bearer ${token}`);
    const tempFiles = () => (existsSync(path.join(uploadDir, '.tmp')) ? readdirSync(path.join(uploadDir, '.tmp')) : []);

    it('rejects non-admins and unsupported files, leaving nothing behind', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      await api().post('/api/v1/uploads').attach('file', PNG, 'a.png').expect(401);
      await send(customer.token).attach('file', PNG, 'a.png').expect(403);
      await send(admin.token).attach('file', Buffer.from('<svg></svg> not an image'), 'a.png').expect(400);
      await send(admin.token).field('folder', 'products').expect(400);
      expect(tempFiles()).toEqual([]);
    });

    it('sorts files into folders by kind, purpose and date, and serves them', async () => {
      const admin = await createAdmin();
      const now = new Date();
      const dated = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

      const image = await send(admin.token).field('folder', 'products').attach('file', PNG, 'x.png').expect(201);
      expect(image.body.url).toMatch(new RegExp(`^/uploads/images/products/${dated}/[\\w-]+\\.png$`));
      expect(existsSync(path.join(uploadDir, image.body.url.replace('/uploads/', '')))).toBe(true);
      await api().get(image.body.url).expect(200).expect('Content-Type', /png/);

      const pdf = await send(admin.token).attach('file', Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(32)]), 'a.pdf').expect(201);
      expect(pdf.body.url).toMatch(new RegExp(`^/uploads/documents/general/${dated}/`));

      const video = await send(admin.token).field('folder', 'banners').attach('file', Buffer.concat([Buffer.from('0000ftypisom'), Buffer.alloc(32)]), 'a.mp4').expect(201);
      expect(video.body.url).toMatch(new RegExp(`^/uploads/videos/banners/${dated}/`));

      const sheet = await send(admin.token).attach('file', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]), 'a.xlsx').expect(201);
      await api().get(sheet.body.url).expect(200).expect('Content-Disposition', 'attachment');
      expect(tempFiles()).toEqual([]);
    });

    it('cannot be steered outside the folders by a crafted folder name', async () => {
      const admin = await createAdmin();
      const { body } = await send(admin.token).field('folder', '../../etc').attach('file', PNG, '../../evil.png').expect(201);
      expect(body.url).toMatch(/^\/uploads\/images\/general\//);
      expect(body.url).not.toContain('evil');
    });

    it('applies a smaller limit to images than to videos', async () => {
      const admin = await createAdmin();
      const big = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
      const refused = await send(admin.token).attach('file', big, 'big.png').expect(400);
      expect(refused.body.error.code).toBe('FILE_TOO_LARGE');
      expect(tempFiles()).toEqual([]);
    });

    it('still serves files from before the folder structure at their old addresses', async () => {
      mkdirSync(path.join(uploadDir, 'legacy', 'seed'), { recursive: true });
      writeFileSync(path.join(uploadDir, 'legacy', 'seed', 'old.png'), PNG);
      await api().get('/uploads/seed/old.png').expect(200);
    });

    it('does not expose temporary files', async () => {
      mkdirSync(path.join(uploadDir, '.tmp'), { recursive: true });
      writeFileSync(path.join(uploadDir, '.tmp', 'secret'), 'x');
      await api().get('/uploads/.tmp/secret').expect(404);
      rmSync(path.join(uploadDir, '.tmp', 'secret'));
    });
  });

  it('keeps category paths correct when a branch moves', async () => {
    const admin = await createAdmin();
    const root = await createCategory('Root');
    const middle = await createCategory('Middle', root._id);
    const leaf = await Category.create({
      name: 'Leaf',
      slug: 'leaf',
      parent: middle._id,
      ancestors: [root._id, middle._id],
    });
    const newRoot = await createCategory('New Root');
    await api()
      .patch(`/api/v1/categories/${middle._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ parent: String(newRoot._id) })
      .expect(200);
    const moved = await Category.findById(leaf._id);
    expect(moved!.ancestors.map(String)).toEqual([String(newRoot._id), String(middle._id)]);
  });

  it('refuses to nest a category inside its own descendant', async () => {
    const admin = await createAdmin();
    const root = await createCategory('Root');
    const child = await createCategory('Child', root._id);
    await api()
      .patch(`/api/v1/categories/${root._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ parent: String(child._id) })
      .expect(400);
  });

  it('lists all categories for admins with counts that include subcategories', async () => {
    const admin = await createAdmin();
    const parent = await createCategory('Parent');
    const child = await createCategory('Child', parent._id);
    await Category.updateOne({ _id: child._id }, { isActive: false });
    await createProduct({ category: parent._id });
    await createProduct({ category: child._id });
    await createProduct({ category: child._id });

    await api().get('/api/v1/categories/admin/list').expect(401);
    const { body } = await api()
      .get('/api/v1/categories/admin/list')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const countFor = (id: unknown) =>
      body.items.find((item: { _id: string }) => item._id === String(id)).productCount;
    expect(countFor(parent._id)).toBe(3);
    expect(countFor(child._id)).toBe(2);

    // Hidden categories stay out of the public list, even if asked for.
    const open = await api().get('/api/v1/categories?all=true').expect(200);
    expect(open.body.items.map((item: { _id: string }) => item._id)).not.toContain(String(child._id));
  });

  it('filters and counts admin product lists', async () => {
    const admin = await createAdmin();
    const auth = { Authorization: `Bearer ${admin.token}` };
    const parent = await createCategory('Parent');
    const child = await createCategory('Child', parent._id);
    await createProduct({ name: 'Plenty', stock: 50, category: child._id });
    await createProduct({ name: 'Few', stock: 3 });
    await createProduct({ name: 'None', stock: 0 });
    await createProduct({ name: 'Hidden Draft', status: 'draft', stock: 20 });
    const names = (body: { items: { name: string }[] }) => body.items.map((item) => item.name).sort();

    const all = await api().get('/api/v1/products/admin/list').set(auth).expect(200);
    expect(all.body.stats).toEqual({ all: 4, active: 3, draft: 1, low: 1, out: 1, featured: 0 });
    const low = await api().get('/api/v1/products/admin/list?stock=low').set(auth).expect(200);
    expect(names(low.body)).toEqual(['Few']);
    // Counts describe the whole store, whatever the filter.
    expect(low.body.stats.all).toBe(4);
    const out = await api().get('/api/v1/products/admin/list?stock=out').set(auth).expect(200);
    expect(names(out.body)).toEqual(['None']);
    const draft = await api().get('/api/v1/products/admin/list?status=draft').set(auth).expect(200);
    expect(names(draft.body)).toEqual(['Hidden Draft']);
    const inParent = await api()
      .get(`/api/v1/products/admin/list?category=${parent._id}`)
      .set(auth)
      .expect(200);
    expect(names(inParent.body)).toEqual(['Plenty']);
    await api().get('/api/v1/products/admin/list').expect(401);
  });

  it('filters and counts admin users', async () => {
    const admin = await createAdmin();
    const auth = { Authorization: `Bearer ${admin.token}` };
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Shopper', email: 'shopper@example.com', password: 'password123' })
      .expect(201);
    const all = await api().get('/api/v1/admin/users').set(auth).expect(200);
    expect(all.body.stats).toEqual({ all: 2, customers: 1, admins: 1, active: 2, disabled: 0, banned: 0 });
    const customers = await api().get('/api/v1/admin/users?role=customer').set(auth).expect(200);
    expect(customers.body.items).toHaveLength(1);
    expect(customers.body.items[0].name).toBe('Shopper');
    const disabled = await api().get('/api/v1/admin/users?status=disabled').set(auth).expect(200);
    expect(disabled.body.items).toHaveLength(0);
  });

  describe('user management', () => {
    const sendBearer = (token: string) => ({ Authorization: `Bearer ${token}` });
    const login = (email: string, password = 'password123') =>
      api().post('/api/v1/auth/login').send({ email, password });
    const newUser = { name: 'Nadia', email: 'NADIA@example.com', password: 'password123', phone: '01712345678' };

    it('creates users, only for admins, and rejects duplicates', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      await api().post('/api/v1/admin/users').set(sendBearer(customer.token)).send(newUser).expect(403);
      const made = await api().post('/api/v1/admin/users').set(sendBearer(admin.token)).send({ ...newUser, role: 'admin' }).expect(201);
      expect(made.body.user.email).toBe('nadia@example.com');
      expect(JSON.stringify(made.body)).not.toContain('password');
      await login('nadia@example.com').expect(200);
      await api().post('/api/v1/admin/users').set(sendBearer(admin.token)).send(newUser).expect(409);
      await api().post('/api/v1/admin/users').set(sendBearer(admin.token)).send({ ...newUser, email: 'x@example.com', password: 'abc' }).expect(422);
    });

    it('edits only what was sent, and changing a password ends their sessions', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      const edit = (body: object) =>
        api().patch(`/api/v1/admin/users/${customer.id}`).set(sendBearer(admin.token)).send(body);
      const { body } = await edit({ name: 'New Name' }).expect(200);
      expect(body.user.name).toBe('New Name');
      expect(body.user.email).toBe(customer.email);
      expect(body.user.role).toBe('customer');
      await edit({ phone: '01812345678' }).expect(200);
      const cleared = await edit({ phone: '' }).expect(200);
      expect(cleared.body.user.phone).toBeUndefined();
      await edit({ password: 'brand-new-pass' }).expect(200);
      await login(customer.email).expect(401);
      await login(customer.email, 'brand-new-pass').expect(200);
      const cookie = customer.cookie[0]!.split(';')[0]!;
      await RefreshToken.updateMany({ revokedAt: { $ne: null } }, { revokedAt: new Date(Date.now() - 60_000) });
      await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('keeps an admin as an admin, with their phone, when only the name changes', async () => {
      const admin = await createAdmin();
      const made = await api().post('/api/v1/admin/users').set(sendBearer(admin.token)).send({ ...newUser, role: 'admin' }).expect(201);
      const { body } = await api().patch(`/api/v1/admin/users/${made.body.user._id}`).set(sendBearer(admin.token)).send({ name: 'Renamed' }).expect(200);
      expect(body.user.role).toBe('admin');
      expect(body.user.phone).toBe('01712345678');
    });

    it('refuses an email already in use by someone else', async () => {
      const admin = await createAdmin();
      const first = await registerCustomer();
      const second = await registerCustomer();
      await api().patch(`/api/v1/admin/users/${second.id}`).set(sendBearer(admin.token)).send({ email: first.email }).expect(409);
      await api().patch(`/api/v1/admin/users/${second.id}`).set(sendBearer(admin.token)).send({ email: second.email }).expect(200);
    });

    it('disabling blocks sign-in with a clear message, and enabling restores it', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      const edit = (body: object) =>
        api().patch(`/api/v1/admin/users/${customer.id}`).set(sendBearer(admin.token)).send(body);
      await edit({ isActive: false }).expect(200);
      const blocked = await login(customer.email).expect(403);
      expect(blocked.body.error.message).toMatch(/disabled/);
      // A wrong password learns nothing about the account's state.
      await login(customer.email, 'wrong-password').expect(401);
      await edit({ isActive: true }).expect(200);
      await login(customer.email).expect(200);
    });

    it('banning needs a reason, shows it at sign-in, and counts apart from disabled', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      const auth = sendBearer(admin.token);
      const edit = (body: object) => api().patch(`/api/v1/admin/users/${customer.id}`).set(auth).send(body);
      await edit({ isBanned: true }).expect(400);
      await edit({ isBanned: true, banReason: 'Fake orders' }).expect(200);
      const blocked = await login(customer.email).expect(403);
      expect(blocked.body.error.message).toContain('Fake orders');
      const list = await api().get('/api/v1/admin/users?status=banned').set(auth).expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.stats).toMatchObject({ banned: 1, disabled: 0, active: 1 });
      await api().post('/api/v1/auth/forgot-password').send({ email: customer.email }).expect(200);
      expect((await User.findById(customer.id).select('+passwordResetHash'))!.passwordResetHash).toBeUndefined();
      const lifted = await edit({ isBanned: false }).expect(200);
      expect(lifted.body.user.banReason).toBeUndefined();
      await login(customer.email).expect(200);
    });

    it('deleting removes the account and cart but keeps orders', async () => {
      const admin = await createAdmin();
      const customer = await registerCustomer();
      const product = await createProduct();
      const line = { product: String(product._id), variant: String(product.variants[0]!._id), quantity: 1 };
      await api().post('/api/v1/orders').set(sendBearer(customer.token)).send({
        idempotencyKey: 'delete-user-test',
        items: [line],
        shippingAddress: { fullName: 'A B', phone: '01712345678', district: 'Dhaka', area: 'Gulshan', line1: 'House 1, Road 2' },
      }).expect(201);
      await api().put('/api/v1/cart').set(sendBearer(customer.token)).send({ items: [line] }).expect(200);

      const list = await api().get('/api/v1/admin/users?role=customer').set(sendBearer(admin.token)).expect(200);
      expect(list.body.items[0].orderCount).toBe(1);

      await api().delete(`/api/v1/admin/users/${customer.id}`).expect(401);
      await api().delete(`/api/v1/admin/users/${customer.id}`).set(sendBearer(customer.token)).expect(403);
      await api().delete(`/api/v1/admin/users/${customer.id}`).set(sendBearer(admin.token)).expect(204);
      await login(customer.email).expect(401);
      expect(await Cart.countDocuments({ user: customer.id })).toBe(0);
      const orders = await api().get('/api/v1/orders').set(sendBearer(admin.token)).expect(200);
      expect(orders.body.items).toHaveLength(1);
      const detail = await api().get(`/api/v1/orders/${orders.body.items[0]._id}`).set(sendBearer(admin.token)).expect(200);
      expect(detail.body.order.user).toBeNull();
      await api().delete(`/api/v1/admin/users/${customer.id}`).set(sendBearer(admin.token)).expect(404);
    });

    it('never lets admins lock themselves out, but lets them edit their details', async () => {
      const admin = await createAdmin();
      const me = (await api().get('/api/v1/users/me').set(sendBearer(admin.token)).expect(200)).body.user.id;
      const edit = (body: object) => api().patch(`/api/v1/admin/users/${me}`).set(sendBearer(admin.token)).send(body);
      await edit({ role: 'customer' }).expect(400);
      await edit({ isActive: false }).expect(400);
      await edit({ isBanned: true, banReason: 'Testing' }).expect(400);
      await edit({ password: 'another-pass-1' }).expect(400);
      await api().delete(`/api/v1/admin/users/${me}`).set(sendBearer(admin.token)).expect(400);
      const renamed = await edit({ name: 'Renamed Admin' }).expect(200);
      expect(renamed.body.user.name).toBe('Renamed Admin');
    });
  });

  it('refuses to delete a category that still has products', async () => {
    const admin = await createAdmin();
    const category = await createCategory();
    await createProduct({ category: category._id });
    await api()
      .delete(`/api/v1/categories/${category._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(409);
  });

  it('returns structured errors for unknown routes and bad JSON', async () => {
    const missing = await api().get('/api/v1/nope').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
  });

  it('builds the home page payload', async () => {
    const { body } = await api().get('/api/v1/content/home').expect(200);
    expect(Object.keys(body.sections)).toEqual([
      'customerFavorites',
      'forYou',
      'trending',
      'bestDeal',
      'firstOrderDeal',
      'featured',
    ]);
  });

  it('builds category product cards from chosen categories only', async () => {
    const parent = await createCategory('Fashion');
    const child = await createCategory('Shoes', parent._id);
    const notChosen = await createCategory('Grocery');
    const empty = await createCategory('Empty');
    await Category.updateMany({ _id: { $in: [parent._id, empty._id] } }, { homeShowcase: true });
    for (let i = 0; i < 5; i += 1) await createProduct({ name: `Shoe ${i}`, category: child._id });
    await createProduct({ name: 'Hidden', category: parent._id, status: 'draft' });
    await createProduct({ name: 'Rice', category: notChosen._id });

    const { body } = await api().get('/api/v1/content/home').expect(200);
    expect(body.categoryShowcases).toHaveLength(1);
    const [card] = body.categoryShowcases;
    expect(card.category.slug).toBe(parent.slug);
    expect(card.products).toHaveLength(4);
    for (const product of card.products) expect(product.name).toMatch(/^Shoe/);
  });

  it('shows at most four category cards', async () => {
    for (let i = 0; i < 5; i += 1) {
      const category = await createCategory(`Category ${i}`);
      await Category.updateOne({ _id: category._id }, { homeShowcase: true, sortOrder: i });
      await createProduct({ category: category._id });
    }
    const { body } = await api().get('/api/v1/content/home').expect(200);
    expect(body.categoryShowcases).toHaveLength(4);
    expect(body.categoryShowcases[0].category.name).toBe('Category 0');
  });

  it('keeps featured and first-order products in separate homepage strips', async () => {
    const featured = await createProduct({ name: 'Featured Item' });
    const deal = await createProduct({ name: 'Deal Item' });
    await Product.updateOne({ _id: featured._id }, { sections: ['featured'] });
    await Product.updateOne({ _id: deal._id }, { sections: ['first-order-deal'] });
    const { body } = await api().get('/api/v1/content/home').expect(200);
    const names = (items: { name: string }[]) => items.map((item) => item.name);
    expect(names(body.sections.featured)).toEqual(['Featured Item']);
    expect(names(body.sections.firstOrderDeal)).toEqual(['Deal Item']);
  });
});

describe('partial updates', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  it('leaves coupon fields that were not sent untouched', async () => {
    const admin = await createAdmin();
    const coupon = await Coupon.create({
      code: 'KEEP',
      type: 'percent',
      value: 10,
      maxDiscount: 500_00,
      firstOrderOnly: true,
    });
    await api()
      .patch(`/api/v1/coupons/${coupon._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ isActive: false })
      .expect(200);
    const updated = await Coupon.findById(coupon._id);
    expect(updated!.isActive).toBe(false);
    expect(updated!.value).toBe(10);
    expect(updated!.maxDiscount).toBe(500_00);
    expect(updated!.firstOrderOnly).toBe(true);
  });

  it('leaves product fields that were not sent untouched', async () => {
    const admin = await createAdmin();
    const product = await createProduct({ brand: 'Keep Brand', minOrderQty: 3 });
    await api()
      .patch(`/api/v1/products/${product._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'New Name' })
      .expect(200);
    const updated = await Product.findById(product._id);
    expect(updated!.name).toBe('New Name');
    expect(updated!.brand).toBe('Keep Brand');
    expect(updated!.minOrderQty).toBe(3);
  });

  it('sets and clears a category image without moving the category', async () => {
    const admin = await createAdmin();
    const parent = await createCategory('Parent');
    const child = await createCategory('Child', parent._id);
    const patch = (body: object) =>
      api()
        .patch(`/api/v1/categories/${child._id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send(body)
        .expect(200);

    await patch({ image: '/uploads/icon.png' });
    let updated = await Category.findById(child._id);
    expect(updated!.image).toBe('/uploads/icon.png');
    expect(String(updated!.parent)).toBe(String(parent._id));
    expect(updated!.ancestors).toHaveLength(1);

    await patch({ image: null });
    updated = await Category.findById(child._id);
    expect(updated!.image).toBeNull();
  });
});

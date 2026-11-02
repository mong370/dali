import { createServer, type AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { RefreshToken } from '../modules/auth/refreshToken.model.js';
import { api, clearDb, createAdmin, registerCustomer, setupDb, teardownDb } from './helpers.js';

const cookieValue = (cookies: string[]) => cookies[0]!.split(';')[0]!;

describe('auth', () => {
  beforeAll(setupDb);
  beforeEach(clearDb);
  afterAll(teardownDb);

  it('registers, never returns the password, and sets an httpOnly cookie', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Nadia', email: 'NADIA@example.com', password: 'password123' })
      .expect(201);
    expect(response.body.user.email).toBe('nadia@example.com');
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(response.headers['set-cookie']![0]).toMatch(/HttpOnly/);
  });

  it('rejects duplicate emails and short passwords', async () => {
    const { email } = await registerCustomer();
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Copy', email, password: 'password123' })
      .expect(409);
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Short', email: 'short@example.com', password: 'abc' })
      .expect(422);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const { email } = await registerCustomer();
    const wrong = await api().post('/api/v1/auth/login').send({ email, password: 'wrongpass1' });
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpass1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('rejects NoSQL operator injection at login', async () => {
    await api()
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: 'password123' })
      .expect(422);
  });

  it('rotates refresh tokens', async () => {
    const { cookie } = await registerCustomer();
    const response = await api()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieValue(cookie))
      .expect(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(cookieValue(response.headers['set-cookie'] as unknown as string[])).not.toBe(
      cookieValue(cookie),
    );
  });

  it('allows a just-rotated token in the grace period, then treats reuse as theft', async () => {
    const { cookie } = await registerCustomer();
    const first = cookieValue(cookie);
    const refreshed = await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);
    await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);

    await RefreshToken.updateMany(
      { revokedAt: { $ne: null } },
      { revokedAt: new Date(Date.now() - 60_000) },
    );
    await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(401);

    // The whole family is now revoked, including the newest token.
    const newest = cookieValue(refreshed.headers['set-cookie'] as unknown as string[]);
    await RefreshToken.updateMany(
      { revokedAt: { $ne: null } },
      { revokedAt: new Date(Date.now() - 60_000) },
    );
    await api().post('/api/v1/auth/refresh').set('Cookie', newest).expect(401);
  });

  it('logout invalidates the session', async () => {
    const { cookie } = await registerCustomer();
    await api().post('/api/v1/auth/logout').set('Cookie', cookieValue(cookie)).expect(204);
    await RefreshToken.updateMany({}, { revokedAt: new Date(Date.now() - 60_000) });
    await api().post('/api/v1/auth/refresh').set('Cookie', cookieValue(cookie)).expect(401);
  });

  describe('password-reset email', () => {
    // A minimal SMTP server that records what it receives.
    function fakeSmtp() {
      const received: string[] = [];
      const server = createServer((socket) => {
        let inData = false;
        socket.write('220 test\r\n');
        socket.on('data', (chunk) => {
          for (const line of chunk.toString().split('\r\n').filter(Boolean)) {
            if (inData) {
              received.push(line);
              if (line === '.') {
                inData = false;
                socket.write('250 ok\r\n');
              }
            } else if (line === 'DATA') {
              inData = true;
              socket.write('354 go\r\n');
            } else if (line === 'QUIT') {
              socket.end('221 bye\r\n');
            } else {
              socket.write('250 ok\r\n');
            }
          }
        });
      });
      return { server, received };
    }

    afterEach(() => {
      delete env.SMTP_URL;
    });

    it('emails a working reset link through SMTP_URL', async () => {
      const { server, received } = fakeSmtp();
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      env.SMTP_URL = `smtp://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const { email } = await registerCustomer();
      await api().post('/api/v1/auth/forgot-password').send({ email }).expect(200);
      server.close();
      const body = received.join('').replace(/=\s*/g, '');
      const token = /token3D([\w-]+)|token=([\w-]+)/.exec(body);
      expect(token).not.toBeNull();
      await api()
        .post('/api/v1/auth/reset-password')
        .send({ token: token![1] ?? token![2], password: 'after-reset-pass' })
        .expect(200);
      await api().post('/api/v1/auth/login').send({ email, password: 'after-reset-pass' }).expect(200);
    });

    it('gives the same answer when the mail server is down', async () => {
      env.SMTP_URL = 'smtp://127.0.0.1:1';
      const { email } = await registerCustomer();
      const known = await api().post('/api/v1/auth/forgot-password').send({ email }).expect(200);
      const unknown = await api().post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' }).expect(200);
      expect(known.body).toEqual(unknown.body);
    });
  });

  it('protects routes by role', async () => {
    const customer = await registerCustomer();
    const admin = await createAdmin();
    await api().get('/api/v1/admin/dashboard').expect(401);
    await api()
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(403);
    await api()
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it('rejects a tampered token', async () => {
    await api().get('/api/v1/users/me').set('Authorization', 'Bearer not.a.token').expect(401);
  });
});

import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { errorHandler } from '../middleware/error.middleware';
import { UserModel } from '../models/user.model';
import { REFRESH_COOKIE_NAME } from '../services/auth.service';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/test-db';

const app = createApp();

function cookieValue(res: request.Response, name: string): string | null {
  const cookies = res.headers['set-cookie'] ?? [];
  for (const c of cookies) {
    const m = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(c);
    if (m && m[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

function setCookieHeader(res: request.Response, name: string): string {
  const cookies = res.headers['set-cookie'] ?? [];
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) return c.split(';')[0]!;
  }
  throw new Error(`cookie ${name} not set`);
}

const base = '/api/v1/auth';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('POST /auth/register', () => {
  it('creates a student and returns tokens + refresh cookie', async () => {
    const res = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Ann Student', email: 'Ann@Example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: 'Ann Student',
      email: 'ann@example.com',
      role: 'student',
      isActive: true,
    });
    expect(res.body.data.user.id).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toBeTruthy();

    const cookie = res.headers['set-cookie']?.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');

    const dbUser = await UserModel.findOne({ email: 'ann@example.com' }).select(
      '+passwordHash +refreshTokenHash',
    );
    expect(dbUser).not.toBeNull();
    expect(dbUser!.refreshTokenHash).toBeTruthy();
    expect(dbUser!.passwordHash.startsWith('$2')).toBe(true);
  });

  it('rejects duplicate email with CONFLICT', async () => {
    const first = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Ann One', email: 'dup@example.com', password: 'password123' });
    expect(first.status).toBe(201);

    const res = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Ann Two', email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects role=admin at the schema level', async () => {
    const res = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Evil', email: 'evil@example.com', password: 'password123', role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Short', email: 'short@example.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post(`${base}/register`)
      .send({ name: 'Log In', email: 'login@example.com', password: 'password123' });
  });

  it('returns user + accessToken with valid credentials', async () => {
    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('login@example.com');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(cookieValue(res, REFRESH_COOKIE_NAME)).toBeTruthy();
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: 'login@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post(`${base}/login`)
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /auth/me', () => {
  it('returns the current user with a valid bearer token', async () => {
    const reg = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Me User', email: 'me@example.com', password: 'password123' });

    const res = await request(app)
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${reg.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: 'me@example.com', name: 'Me User' });
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`${base}/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with a garbage token', async () => {
    const res = await request(app).get(`${base}/me`).set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a deactivated account', async () => {
    const reg = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Off', email: 'off@example.com', password: 'password123' });
    await UserModel.updateOne({ email: 'off@example.com' }, { isActive: false });

    const res = await request(app)
      .get(`${base}/me`)
      .set('Authorization', `Bearer ${reg.body.data.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('POST /auth/refresh', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    const login = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Ref', email: 'ref@example.com', password: 'password123' });
    const cookie1 = setCookieHeader(login, REFRESH_COOKIE_NAME);

    const res = await request(app).post(`${base}/refresh`).set('Cookie', cookie1);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const cookie2 = setCookieHeader(res, REFRESH_COOKIE_NAME);
    expect(cookie2).not.toBe(cookie1);
  });

  it('rejects reuse of a rotated (old) refresh token', async () => {
    const login = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Old', email: 'old@example.com', password: 'password123' });
    const cookie1 = setCookieHeader(login, REFRESH_COOKIE_NAME);

    await request(app).post(`${base}/refresh`).set('Cookie', cookie1);

    const res = await request(app).post(`${base}/refresh`).set('Cookie', cookie1);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a missing refresh cookie', async () => {
    const res = await request(app).post(`${base}/refresh`);
    expect(res.status).toBe(401);
  });

  it('rejects a garbage refresh cookie', async () => {
    const res = await request(app)
      .post(`${base}/refresh`)
      .set('Cookie', `${REFRESH_COOKIE_NAME}=not-a-jwt`);
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('clears the cookie and invalidates the refresh token', async () => {
    const login = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Out', email: 'out@example.com', password: 'password123' });
    const cookie = setCookieHeader(login, REFRESH_COOKIE_NAME);

    const res = await request(app)
      .post(`${base}/logout`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const cleared = res.headers['set-cookie']?.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(cleared).toContain('Max-Age=0');

    const refreshAfter = await request(app).post(`${base}/refresh`).set('Cookie', cookie);
    expect(refreshAfter.status).toBe(401);
  });

  it('requires auth', async () => {
    const res = await request(app).post(`${base}/logout`);
    expect(res.status).toBe(401);
  });
});

describe('requireRole', () => {
  const roleApp = express();
  roleApp.get('/admin-only', requireAuth, requireRole('admin'), (_req, res) => {
    res.json({ data: { ok: true } });
  });
  roleApp.use(errorHandler);

  it('returns 403 for a student and 200 for an admin', async () => {
    const student = await request(app)
      .post(`${base}/register`)
      .send({ name: 'Stu', email: 'stu@example.com', password: 'password123' });

    const forbidden = await request(roleApp)
      .get('/admin-only')
      .set('Authorization', `Bearer ${student.body.data.accessToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    await UserModel.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: bcrypt.hashSync('password123', 4),
      role: 'admin',
    });

    const login = await request(app)
      .post(`${base}/login`)
      .send({ email: 'admin@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('admin');

    const allowed = await request(roleApp)
      .get('/admin-only')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.ok).toBe(true);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(roleApp).get('/admin-only');
    expect(res.status).toBe(401);
  });
});

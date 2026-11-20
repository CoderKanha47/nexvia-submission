import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { UserModel } from '../models/user.model';
import { Course } from '../models';
import { clearTestDb, connectTestDb, disconnectTestDb } from './helpers/test-db';
import { signAccessToken } from '../utils/token';

const app = createApp();

beforeAll(async () => await connectTestDb());
afterAll(async () => await disconnectTestDb());
beforeEach(async () => await clearTestDb());

describe('POST /api/v1/videos/upload-url', () => {
  it('returns a presigned upload URL for an instructor', async () => {
    const user = await UserModel.create({
      name: 'Instructor',
      email: 'inst@example.com',
      passwordHash: 'x',
      role: 'instructor',
    });
    const token = signAccessToken({ sub: user.id, role: 'instructor', email: user.email });

    const course = await Course.create({
      title: 'Test Course',
      slug: 'test-course',
      instructorId: user._id,
      priceCents: 0,
      currency: 'USD',
      category: 'Development',
      level: 'beginner',
      description: 'Test course description',
    });

    const res = await request(app)
      .post('/api/v1/videos/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: course.id, filename: 'test.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect(res.body.data.assetId).toBeTruthy();
    expect(res.body.data.uploadUrl).toBeTruthy();
  });
});

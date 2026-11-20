import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/test-db';
import { Course } from '../models/Course';
import { UserModel } from '../models/user.model';
import { signAccessToken } from '../utils/token';
import { isComingSoon } from '../services/course.service';

const app = createApp();

let studentToken: string;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  const student = await UserModel.create({
    name: 'Test Student',
    email: 'student@example.com',
    passwordHash: bcrypt.hashSync('password123', 4),
    role: 'student',
    isActive: true,
  });
  studentToken = signAccessToken({
    sub: student.id,
    role: student.role,
    email: student.email,
  });
});

async function createCourse(overrides: Record<string, unknown> = {}) {
  const instructor = await UserModel.create({
    name: 'Instructor',
    email: `instructor-${Date.now()}@example.com`,
    passwordHash: bcrypt.hashSync('password123', 4),
    role: 'instructor',
    isActive: true,
  });
  return Course.create({
    instructorId: instructor._id,
    title: 'Guarded Course',
    slug: `guarded-course-${Math.random().toString(36).slice(2, 8)}`,
    description: 'Course under test',
    category: 'Programming',
    level: 'beginner',
    priceCents: 99900,
    status: 'published',
    ...overrides,
  });
}

describe('isComingSoon (single source of truth)', () => {
  it('is true only when the course has zero lessons', () => {
    expect(isComingSoon(0)).toBe(true);
    expect(isComingSoon(1)).toBe(false);
    expect(isComingSoon(20)).toBe(false);
  });
});

describe('coming-soon enrollment guards', () => {
  it('rejects free enroll for a coming-soon course', async () => {
    const course = await createCourse({ priceCents: 0 });

    const res = await request(app)
      .post(`/api/v1/enrollments/courses/${course._id}/enroll-free`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/coming soon/i);
  });

  it('rejects checkout for a coming-soon course', async () => {
    const course = await createCourse();

    const res = await request(app)
      .get(`/api/v1/payments/courses/${course._id}/checkout`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a PayNext payment for a coming-soon course', async () => {
    const course = await createCourse();

    const res = await request(app)
      .post('/api/v1/paynext/pay')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId: course._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/coming soon/i);
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/test-db';
import { Course, ICourse } from '../models/Course';
import { Section, ISection } from '../models/Section';
import { Lesson, ILesson } from '../models/Lesson';
import { UserModel, UserRole } from '../models/user.model';
import { signAccessToken } from '../utils/token';

const app = createApp();

let instructorUser: mongoose.Document & { id: string; _id: mongoose.Types.ObjectId; email: string; name: string; role: UserRole; isActive: boolean };
let adminUser: mongoose.Document & { id: string; _id: mongoose.Types.ObjectId; email: string; name: string; role: UserRole; isActive: boolean };
let instructorToken: string;
let adminToken: string;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  
  // Create instructor user
  instructorUser = await UserModel.create({
    name: 'Test Instructor',
    email: 'instructor@example.com',
    passwordHash: bcrypt.hashSync('password123', 4),
    role: 'instructor',
    isActive: true,
  });
  instructorToken = signAccessToken({ sub: instructorUser.id, role: instructorUser.role, email: instructorUser.email });

  // Create admin user
  adminUser = await UserModel.create({
    name: 'Test Admin',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('password123', 4),
    role: 'admin',
    isActive: true,
  });
  adminToken = signAccessToken({ sub: adminUser.id, role: adminUser.role, email: adminUser.email });
});

describe('Course API', () => {
  describe('GET /api/v1/courses', () => {
    it('returns empty list when no courses', async () => {
      const res = await request(app).get('/api/v1/courses');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0 });
    });

    it('returns only published courses', async () => {
      await Course.create({
        instructorId: instructorUser._id,
        title: 'Published Course',
        slug: 'published-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      await Course.create({
        instructorId: instructorUser._id,
        title: 'Draft Course',
        slug: 'draft-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });

      const res = await request(app).get('/api/v1/courses?includeComingSoon=true');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Published Course');
    });

    it('excludes coming-soon courses (no lessons) by default', async () => {
      await Course.create({
        instructorId: instructorUser._id,
        title: 'Live Course',
        slug: 'live-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      const live = await Course.create({
        instructorId: instructorUser._id,
        title: 'Ready Course',
        slug: 'ready-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      const section = await Section.create({ courseId: live._id, title: 'S1', order: 0 });
      await Lesson.create({
        courseId: live._id,
        sectionId: section._id,
        title: 'L1',
        type: 'video',
        order: 0,
        durationSec: 100,
      });

      const res = await request(app).get('/api/v1/courses');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Ready Course');
      expect(res.body.data[0].comingSoon).toBe(false);
      expect(res.body.meta.total).toBe(1);
    });

    it('returns the full catalog with includeComingSoon=true and flags each row', async () => {
      const live = await Course.create({
        instructorId: instructorUser._id,
        title: 'Ready Course',
        slug: 'ready-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      await Course.create({
        instructorId: instructorUser._id,
        title: 'Soon Course',
        slug: 'soon-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      const section = await Section.create({ courseId: live._id, title: 'S1', order: 0 });
      await Lesson.create({
        courseId: live._id,
        sectionId: section._id,
        title: 'L1',
        type: 'video',
        order: 0,
        durationSec: 100,
      });

      const res = await request(app).get('/api/v1/courses?includeComingSoon=true');
      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2 });
      const byTitle = new Map<string, boolean>(
        res.body.data.map((c: { title: string; comingSoon: boolean }) => [c.title, c.comingSoon])
      );
      expect(byTitle.get('Ready Course')).toBe(false);
      expect(byTitle.get('Soon Course')).toBe(true);
    });

    it('detail endpoint derives comingSoon from lesson count', async () => {
      await Course.create({
        instructorId: instructorUser._id,
        title: 'Soon Course',
        slug: 'soon-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });
      const res = await request(app).get('/api/v1/courses/soon-course');
      expect(res.status).toBe(200);
      expect(res.body.data.comingSoon).toBe(true);
      expect(res.body.data.sections).toEqual([]);
    });
  });

  describe('POST /api/v1/courses', () => {
    it('creates a course as instructor', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'New Course',
          description: 'Course description',
          category: 'Programming',
          level: 'beginner',
          priceCents: 2999,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('New Course');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.instructorId).toBe(instructorUser.id);
      expect(res.body.data.slug).toBe('new-course');
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .send({
          title: 'New Course',
          description: 'Course description',
          category: 'Programming',
          level: 'beginner',
          priceCents: 2999,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/courses/mine', () => {
    it('returns instructor courses', async () => {
      await Course.create({
        instructorId: instructorUser._id,
        title: 'My Course',
        slug: 'my-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });
      await Course.create({
        instructorId: new mongoose.Types.ObjectId(),
        title: 'Other Course',
        slug: 'other-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });

      const res = await request(app)
        .get('/api/v1/courses/mine')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('My Course');
    });
  });

  describe('PATCH /api/v1/courses/:id', () => {
    it('updates own course', async () => {
      const course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Original Title',
        slug: 'original-title',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });

      const res = await request(app)
        .patch(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('forbids updating other instructor course', async () => {
      const otherId = new mongoose.Types.ObjectId();
      const course = await Course.create({
        instructorId: otherId,
        title: 'Other Course',
        slug: 'other-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });

      const res = await request(app)
        .patch(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);
    });

    it('allows admin to update any course', async () => {
      const otherId = new mongoose.Types.ObjectId();
      const course = await Course.create({
        instructorId: otherId,
        title: 'Other Course',
        slug: 'other-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });

      const res = await request(app)
        .patch(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Admin Updated');
    });
  });

  describe('POST /api/v1/courses/:id/submit', () => {
    it('submits draft for review', async () => {
      const course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Draft Course',
        slug: 'draft-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });

      const res = await request(app)
        .post(`/api/v1/courses/${course._id}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('pending_review');
    });

    it('fails for non-draft course', async () => {
      const course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Published Course',
        slug: 'published-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'published',
      });

      const res = await request(app)
        .post(`/api/v1/courses/${course._id}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/courses/:id/publish (admin)', () => {
    it('publishes pending_review course', async () => {
      const course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Pending Course',
        slug: 'pending-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'pending_review',
      });

      const res = await request(app)
        .post(`/api/v1/courses/${course._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('published');
    });
  });

  describe('Sections and Lessons', () => {
    let course: ICourse;

    beforeEach(async () => {
      course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Course with Sections',
        slug: 'course-with-sections',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });
    });

    it('creates a section', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${course._id}/sections`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Section 1' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Section 1');
      expect(res.body.data.courseId).toBe(course._id.toString());
    });

    it('creates a lesson in section', async () => {
      const section = await Section.create({
        courseId: course._id,
        title: 'Section 1',
        order: 0,
      });

      const res = await request(app)
        .post(`/api/v1/courses/sections/${section._id}/lessons`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Lesson 1',
          type: 'video',
          isFreePreview: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Lesson 1');
      expect(res.body.data.type).toBe('video');
      expect(res.body.data.sectionId).toBe(section._id.toString());
    });
  });

  describe('PUT /api/v1/courses/:id/reorder', () => {
    let course: ICourse;
    let section: ISection;
    let lesson: ILesson;

    beforeEach(async () => {
      course = await Course.create({
        instructorId: instructorUser._id,
        title: 'Reorder Course',
        slug: 'reorder-course',
        description: 'Test',
        category: 'Test',
        level: 'beginner',
        priceCents: 1000,
        status: 'draft',
      });
      section = await Section.create({
        courseId: course._id,
        title: 'Section 1',
        order: 0,
      });
      lesson = await Lesson.create({
        courseId: course._id,
        sectionId: section._id,
        title: 'Lesson 1',
        type: 'video',
        order: 0,
      });
    });

    it('reorders sections and lessons', async () => {
      const res = await request(app)
        .put(`/api/v1/courses/${course._id}/reorder`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          sections: [
            {
              id: section._id.toString(),
              order: 5,
              lessons: [
                { id: lesson._id.toString(), order: 10 },
              ],
            },
          ],
        });

      expect(res.status).toBe(204);

      const updatedSection = await Section.findById(section._id);
      const updatedLesson = await Lesson.findById(lesson._id);
      expect(updatedSection?.order).toBe(5);
      expect(updatedLesson?.order).toBe(10);
    });
  });
});
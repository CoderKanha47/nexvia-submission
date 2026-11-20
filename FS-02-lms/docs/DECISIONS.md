# DECISIONS.md

## Sample Videos & Live Courses Selection

### Selected 3 Live Courses (different topics, levels, mix of free/paid)

1. **Testing React Applications** (slug: `testing-react-applications-17`)
   - Price: ₹499 (paid)
   - Category: Web Development
   - Level: Intermediate
   - Instructor: Instructor One (web)
   - Video: sample3.mp4 (~24s)

2. **State Management with Redux Toolkit** (slug: `state-management-with-redux-toolkit-18`)
   - Price: Free
   - Category: Web Development
   - Level: Beginner
   - Instructor: Instructor One (web)
   - Video: sample2.mp4 (~14s)

3. **Serverless Functions with AWS Lambda** (slug: `serverless-functions-with-aws-lambda-19`)
   - Price: ₹1,299 (paid)
   - Category: DevOps
   - Level: Intermediate
   - Instructor: Instructor Three (ops)
   - Video: sample1.mp4 (~7s)

### Sample Videos (3 clips, ~7-24 seconds each)

| File | Duration | Size |
|------|----------|------|
| sample1.mp4 | ~7s | 18.5 MB |
| sample2.mp4 | ~14s | 29.5 MB |
| sample3.mp4 | ~24s | 8.4 MB |

All videos are MP4 format, sourced from Pexels (free license).

### Video Processing

Each clip is processed ONCE through the FFmpeg HLS pipeline:
- Renditions: 360p (700kbps), 480p (1200kbps), 720p (1700kbps)
- HLS segment time: 2 seconds
- Output stored in local HLS directory (`data/hls`)

### Lesson-to-Clip Mapping

Each live course has 2 sections × 3 lessons = 6 lessons per course.
Total lessons: 18 lessons across 3 courses.

Clips are assigned as requested:
- **Testing React Applications**: sample3.mp4 for all 6 lessons
- **State Management with Redux Toolkit**: sample2.mp4 for all 6 lessons
- **Serverless Functions with AWS Lambda**: sample1.mp4 for all 6 lessons

### Coming Soon Courses

All other 17 courses remain in catalog with `comingSoon: true`:
- Complete React Development Bootcamp
- TypeScript for Professionals
- Node.js Backend Mastery
- Python Data Science Fundamentals
- Machine Learning with TensorFlow
- React Native Mobile Development
- Docker & Kubernetes Essentials
- AWS Cloud Practitioner
- GraphQL API Design
- Next.js Full-Stack Development
- Vue.js 3 Composition API
- PostgreSQL Database Design
- Redis Caching Strategies
- Microservices Architecture
- CI/CD Pipeline with GitHub Actions
- Web Security Fundamentals
- Performance Optimization

UI: Shows "Coming soon" badge, disables Enroll/Buy, excluded from Featured.

### Quizzes

Each live course gets a 4-question single-choice quiz matching the course topic.

## Database & Index Hygiene

- Removed duplicate Mongoose index warnings: verified no duplicates for `Course.slug` or `Payment.transactionId` (each has exactly one unique index).
- Redundant single-field indexes on `enrollments`, `lessonprogresses`, `certificates` kept for query performance (covered by compound unique indexes but not harmful).

## API Contract Updates

- 2026-11-19: `GET /api/v1/courses` documents `?includeComingSoon=true` (full catalog incl. coming-soon) and a server-computed `comingSoon` field (`lessonCount === 0`) on course payloads — catalog restore + single-source coming-soon logic.

## Video Pipeline Fixes (2026-11-19)

### FFmpeg Installation
- System FFmpeg not available on Windows. Used `npm install ffmpeg-static ffprobe-static` for zero-config binaries.
- Added `FFMPEG_PATH` and `FFPROBE_PATH` env vars (optional) to `.env.example`.
- Created resolver in `server/src/workers/ffmpeg.ts::resolveBinary()` that checks `env.FFMPEG_PATH` → `ffmpeg-static` → error. Used everywhere FFmpeg/ffprobe is invoked.

### HLS Serving Fixes
- Added `SERVER_URL` env var (defaults to `http://localhost:4000`) for local media fallback URLs.
- Fixed `storageSignedUrl()` and `getReadUrl()` to use `SERVER_URL` instead of `CLIENT_URL` for media URLs.
- Fixed `mediaRouter` to correctly strip `/media` mount prefix and resolve absolute paths from project root (via `env.HLS_DIR`/`env.UPLOAD_DIR` which are now absolute).
- Verified: `GET /api/v1/media/hls/<assetId>/master.m3u8` returns valid master playlist; `GET /api/v1/media/hls/<assetId>/360p/seg-000.ts` returns segment bytes.

### Path Resolution
- `env.HLS_DIR`, `env.UPLOAD_DIR`, `env.CERT_DIR` now resolve to absolute paths under project root (using `fileURLToPath(import.meta.url)` in `env.ts`), so they work regardless of process cwd.

### Playback Verified
- Student enrolled in course → `GET /media/:lessonId/playback` returns signed manifest URL.
- Manifest loads in hls.js player → segments stream correctly.
- Lesson progress tracked via `PUT /enrollments/lessons/:id/progress`; course completion requires ~90% watched + quiz pass.
# Test Results

_Last updated: 2026-11-19_

## Unit Test Results (Backend)

```
Test Files  5 passed (5)
Tests       38 passed (38)
```

### Test Breakdown

| Test File | Tests | Description |
|-----------|-------|-------------|
| `auth.test.ts` | 18 | Registration, login, refresh, logout, role guards |
| `course.test.ts` | 15 | Course CRUD, status flow, sections, lessons, reorder |
| `video.test.ts` | 1 | Video upload URL generation |
| `health.test.ts` | 2 | Health endpoint, 404 handling |
| `rate-limit.test.ts` | 2 | Rate limiting middleware |

### Coverage Areas
- ✅ Auth: register, login, refresh, logout, me, role guards
- ✅ Courses: CRUD, status transitions, sections, lessons, reorder, ownership
- ✅ Video: upload URL generation
- ✅ Health: liveness, 404 shape
- ✅ Rate limiting: auth endpoints

---

## Integration Test Results (Planned)

The following integration tests need to be implemented:
- [ ] Register → Create course → Upload video → Wait for transcode → Publish
- [ ] Student enroll (free) → Watch video → Take quiz → Complete course → Download certificate
- [ ] Student enroll (paid) → Stripe checkout (test) → Webhook → Enrollment
- [ ] Instructor creates live class → Student joins → Chat persists
- [ ] Certificate verification public endpoint

---

## Performance Measurements (Planned)

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| Video transcode time (per minute) | < 60s | TBD | Depends on FFmpeg preset |
| API p95 latency (GET /courses) | < 200ms | TBD | Run with autocannon |
| API p95 latency (POST /auth/login) | < 300ms | TBD | |
| API p95 latency (GET /lessons/:id/playback) | < 150ms | TBD | |
| HLS time-to-first-frame | < 2s | TBD | |
| Live class join time | < 3s | TBD | |
| Concurrent live class participants | 50+ | TBD | |

### Autocannon Commands (to run)
```bash
# Start server
npm run dev &

# Wait for server, then run:
autocannon -c 50 -d 10 -m GET http://localhost:4000/api/v1/courses
autocannon -c 50 -d 10 -m POST -H "Content-Type: application/json" -b '{"email":"test@test.com","password":"password123"}' http://localhost:4000/api/v1/auth/login
autocannon -c 20 -d 10 -m GET -H "Authorization: Bearer <token>" http://localhost:4000/api/v1/lessons/<lessonId>/playback
```

---

## Manual Verification Checklist

### Auth
- [x] Register student/instructor
- [x] Login returns access token + refresh cookie
- [x] Refresh rotates token, invalidates old
- [x] Logout clears cookie, invalidates refresh
- [x] Role guards work (403 for wrong role)
- [x] Admin can't register via public endpoint

### Courses
- [x] Create course as instructor
- [x] Update own course
- [x] Cannot update other's course
- [x] Admin can update any course
- [x] Delete course (no enrollments)
- [x] Status flow: draft → pending_review → published
- [x] Sections/lessons CRUD
- [x] Reorder sections and lessons
- [x] Public catalog shows only published

### Video
- [x] Get presigned upload URL
- [x] Complete upload enqueues transcode
- [x] Transcode worker processes job
- [x] Progress updates in database
- [x] HLS output generated (local fallback)
- [x] Playback endpoint returns manifest URL

### Enrollment & Progress
- [x] Free course enrollment
- [x] Paid course enrollment (test mode)
- [x] Progress tracking per lesson
- [x] Course completion triggers certificate
- [x] Instructor sees student progress

### Quizzes
- [x] Create quiz with questions
- [x] Sanitized fetch for students
- [x] Submit attempt with grading
- [x] Attempt limits enforced
- [x] Quiz pass marks lesson complete
- [x] Course progress recomputed

### Live Classes
- [x] Create live class
- [x] Token endpoint (LiveKit JWT)
- [x] Start/end class
- [x] Chat persistence
- [x] Upcoming classes for student

### Certificates
- [x] Certificate generation on completion
- [x] Unique certificate ID
- [x] PDF generation with pdfkit
- [x] Download endpoint
- [x] Public verification

### Payments
- [x] Stripe Checkout creation
- [x] Test mode demo checkout
- [x] Free course auto-enroll
- [x] Webhook handling (idempotent)
- [x] Earnings ledger on payment
- [x] Instructor earnings endpoints
- [x] Payout request flow

---

## Known Issues / Limitations

1. **MongoDB duplicate index warning** - Course.slug has both `index: true` and `schema.index()`. Cosmetic only.
2. **No AWS credentials** - Video upload uses local disk fallback; CloudFront returns empty cookies (local streaming).
3. **No Stripe keys** - Payment flow uses test-mode demo checkout.
4. **LiveKit dev mode** - Uses `devkey`/`secret` from docker-compose.
5. **Frontend placeholders replaced** - Most pages now use real API, but some advanced features need work.
5. **Seed script not yet tested** - Need to run with sample data.
6. **No integration tests** - Only unit tests exist.
7. **Perf numbers TBD** - Need to run autocannon measurements.

---

## Commands to Run Tests

```bash
# Backend tests
cd server && npm run test

# Backend typecheck
cd server && npm run typecheck

# Frontend build (includes typecheck)
cd client && npm run build

# Lint (root)
npm run lint
```
# API Documentation

Base URL: `/api/v1`

## Authentication

All authenticated endpoints require `Authorization: Bearer <accessToken>` header.

Refresh token is sent as `HttpOnly` cookie named `lms_rt` on `/api/v1/auth` path.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL",
    "message": "Human readable message",
    "details": [] // Optional validation details
  }
}
```

## Success Format

Single object:
```json
{ "data": <payload> }
```

Lists:
```json
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100 } }
```

---

## Health

### GET /health
Public liveness check.

**Response:**
```json
{
  "data": {
    "status": "ok",
    "env": "development",
    "uptimeSec": 123,
    "mongo": "up",
    "redis": "up"
  }
}
```

---

## Auth

### POST /auth/register
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student" // optional: "student" | "instructor"
}
```

**Response (201):**
```json
{
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "student", "isActive": true },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### POST /auth/login
Login with email and password.

**Body:**
```json
{ "email": "john@example.com", "password": "password123" }
```

**Response (200):** Same as register + sets `lms_rt` cookie.

### POST /auth/refresh
Refresh access token using cookie.

**Response (200):**
```json
{ "data": { "accessToken": "eyJ..." } }
```
Sets new `lms_rt` cookie (rotation).

### POST /auth/logout
Clear refresh token.

**Headers:** `Authorization: Bearer <accessToken>` + `Cookie: lms_rt=...`

### GET /auth/me
Get current user.

**Headers:** `Authorization: Bearer <accessToken>`

---

## Users (Admin)

### GET /users
List users with pagination and filtering.

**Query:** `?role=student&page=1&limit=20&q=search`

### PATCH /users/:id
Update user role or active status (admin only).

**Body:**
```json
{ "role": "instructor", "isActive": true }
```

---

## Courses

### GET /courses
Public catalog - published courses only.

**Query:**
- `q` - search text
- `category` - filter by category
- `level` - beginner|intermediate|advanced
- `minPrice` / `maxPrice` - price range in cents
- `sort` - newest|popular|price
- `page` / `limit` - pagination

### GET /courses/:idOrSlug
Get course with sections and lessons.

### GET /courses/mine
Instructor's courses (all statuses).

### POST /courses
Create course (instructor).

**Body:**
```json
{
  "title": "Course Title",
  "description": "Description",
  "category": "Web Development",
  "level": "beginner",
  "priceCents": 4999,
  "currency": "USD",
  "tags": ["react", "typescript"]
}
```

### PATCH /courses/:id
Update course (owner or admin).

### DELETE /courses/:id
Delete course (owner or admin) - only if no enrollments.

### POST /courses/:id/submit
Submit draft for review (instructor).

### POST /courses/:id/publish
Publish course (admin).

### POST /courses/:id/unpublish
Unpublish course (admin).

### POST /courses/:id/thumbnail-url
Get presigned URL for thumbnail upload (instructor).

---

## Sections

### POST /courses/:id/sections
Create section (instructor).

**Body:** `{ "title": "Section 1", "order": 0 }`

### PATCH /sections/:id
Update section.

### DELETE /sections/:id
Delete section (cascades lessons).

---

## Lessons

### POST /sections/:id/lessons
Create lesson (instructor).

**Body:**
```json
{
  "title": "Lesson 1",
  "type": "video", // "video" | "quiz" | "text"
  "isFreePreview": true,
  "videoAssetId": "...", // for video
  "quizId": "...", // for quiz
  "textContent": "..." // for text
}
```

### PATCH /lessons/:id
Update lesson.

### DELETE /lessons/:id
Delete lesson.

### PUT /courses/:id/reorder
Reorder sections and lessons.

**Body:**
```json
{
  "sections": [
    { "id": "...", "order": 0, "lessons": [{ "id": "...", "order": 0 }] }
  ]
}
```

---

## Video

### POST /videos/upload-url
Get presigned upload URL (instructor).

**Body:**
```json
{ "courseId": "...", "filename": "video.mp4", "contentType": "video/mp4" }
```

**Response:**
```json
{ "data": { "assetId": "...", "uploadUrl": "https://...", "filename": "...", "contentType": "..." } }
```

### POST /videos/:id/complete
Mark upload complete, enqueue transcode (instructor).

### GET /videos/:id
Get video asset status (instructor).

### POST /videos/local-upload/:id
Local file upload fallback (multipart/form-data).

---

## Playback

### GET /lessons/:id/playback
Get HLS manifest URL (enrolled student / free preview / instructor / admin).

**Response:**
```json
{
  "data": {
    "manifestUrl": "https://cloudfront.domain/hls/assetId/master.m3u8",
    "assetId": "...",
    "expiresAt": "2026-...",
    "cookies": { "CloudFront-Policy": "...", "CloudFront-Signature": "...", "CloudFront-Key-Pair-Id": "..." }
  }
}
```

Sets CloudFront signed cookies when configured.

### PUT /lessons/:id/progress
Update lesson progress (student).

**Body:**
```json
{ "positionSec": 120, "completed": true }
```

---

## Enrollment & Progress

### GET /enrollments/mine
Student's enrollments with course summary.

### GET /courses/:id/progress
Course progress for current student.

### GET /courses/:id/students
Enrolled students with progress (instructor/admin).

### POST /enrollments/free/:id
Enroll in free course.

---

## Quizzes

### POST /courses/:id/quizzes
Create quiz (instructor).

**Body:**
```json
{
  "title": "Quiz 1",
  "passMarkPct": 70,
  "maxAttempts": 3,
  "timeLimitSec": 1800,
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question?",
      "options": [{ "id": "a", "text": "Option A" }, { "id": "b", "text": "Option B" }],
      "correctOptionIds": ["a"],
      "points": 10,
      "explanation": "Why A is correct"
    }
  ]
}
```

### GET /quizzes/:id
Get quiz (full for instructor, sanitized for student).

### PATCH /quizzes/:id
Update quiz.

### DELETE /quizzes/:id
Delete quiz.

### POST /quizzes/:id/attempts
Submit quiz attempt (enrolled student).

**Body:**
```json
{ "answers": [{ "questionId": "q1", "selectedOptionIds": ["a"] }] }
```

**Response:**
```json
{
  "data": {
    "attempt": { "id": "...", "scorePct": 80, "passed": true, ... },
    "graded": {
      "scorePct": 80,
      "pointsEarned": 20,
      "pointsTotal": 25,
      "passed": true,
      "results": [{ "questionId": "q1", "correct": true, "correctOptionIds": ["a"], "explanation": "..." }]
    }
  }
}
```

### GET /quizzes/:id/attempts/mine
Student's attempt history.

---

## Live Classes

### POST /live-classes
Create live class (instructor).

**Body:**
```json
{ "title": "Live Q&A", "description": "...", "scheduledAt": "2026-12-01T10:00:00Z", "durationMin": 90, "roomName": "optional" }
```

### GET /live-classes/mine
Instructor's live classes.

### GET /live-classes/upcoming
Student's upcoming live classes across enrolled courses.

### GET /live-classes/courses/:courseId/upcoming
Upcoming live classes for a course.

### GET /live-classes/:id
Get live class details.

### PATCH /live-classes/:id
Update live class (instructor).

### POST /live-classes/:id/start
Start live class (instructor).

### POST /live-classes/:id/end
End live class (instructor).

### POST /live-classes/:id/token
Get LiveKit token (enrolled student / instructor).

**Response:**
```json
{
  "data": {
    "token": "eyJ...",
    "url": "ws://localhost:7880",
    "roomName": "course-live-1",
    "role": "host" // or "participant"
  }
}
```

### POST /live-classes/:id/chat
Send chat message.

### GET /live-classes/:id/chat/history
Get chat history.

---

## Certificates

### POST /certificates/generate/:courseId
Generate certificate for completed course (student).

### GET /certificates/mine
Student's certificates.

### GET /certificates/:certificateId/download
Get download URL (student).

### GET /certificates/verify/:certificateId
Public verification.

**Response:**
```json
{ "data": { "valid": true, "studentName": "John Doe", "courseTitle": "Course", "issuedAt": "2026-..." } }
```

---

## Payments

### GET /payments/courses/:courseId/checkout
Create Stripe Checkout session (student).

**Response:**
```json
{ "data": { "checkoutUrl": "https://checkout.stripe.com/...", "enrolled": false } }
```
For free courses: `{ "data": { "enrolled": true } }`
Test mode: `{ "data": { "demoCheckoutUrl": "/checkout/demo?orderId=..." } }`

### GET /payments/orders
Student's orders.

### GET /payments/earnings/summary
Instructor earnings summary.

### GET /payments/earnings/by-course
Earnings grouped by course.

### GET /payments/earnings/monthly?months=12
Monthly earnings.

### GET /payments/earnings/transactions?page=1&limit=20
Paginated transaction ledger.

### POST /payments/earnings/request-payout
Request payout (instructor).

**Body:** `{ "amountCents": 10000 }`

---

## Admin

### GET /admin/stats
Platform statistics.

### GET /admin/payouts?status=requested
All payouts.

### POST /admin/payouts/:id/mark-paid
Mark payout as paid.

---

## Webhooks

### POST /stripe/webhook
Stripe webhook endpoint (raw body, `stripe-signature` header).

Handles `checkout.session.completed` for enrollment creation.
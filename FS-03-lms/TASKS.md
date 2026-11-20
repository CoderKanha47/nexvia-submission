# TASKS.md — single source of truth for progress

Owners: **MiMo** (opencode) = hard integrations and anything subtle. **Nemotron** (kilocode) = CRUD, UI, tests, docs.
**ANY** = whoever is available. Tick `[x]` only when the Definition of Done in AGENTS.md is met.
Because both models are rate limited, tasks are small and ordered; every task lists what it depends on.

Rough token plan: spend MiMo on M1-M3, M5, M6 (hard parts). Keep UI-heavy and repetitive work on Nemotron.
Human (you) does: AWS/CloudFront setup, Stripe + LiveKit account keys, demo recording, presentation, reflection.

## M0 — Foundation
- [x] T-01 MiMo — Monorepo scaffold (npm workspaces), TS strict, ESLint/Prettier, `server` Express app with config, error handler, health route, Mongoose connect, Redis connect, `.env.example`, docker-compose (mongo, redis, livekit dev). Deps: none
- [x] T-02 MiMo — Auth: User model, register/login/refresh/logout/me, bcrypt, JWT, `requireAuth`, `requireRole`, zod validate middleware, tests. Deps: T-01
- [x] T-03 Nemotron — Client scaffold: Vite + React + TS, Redux Toolkit store, RTK Query base API with auth refresh, router with the route map, layout, protected routes. Deps: T-01
- [x] T-04 Nemotron — Auth UI: login/register pages, auth slice, role-based nav. Deps: T-02, T-03

## M1 — Courses
- [x] T-05 Nemotron — Models: Course, Section, Lesson, Enrollment, LessonProgress (per ARCHITECTURE §3) + indexes. Deps: T-01
- [x] T-06 Nemotron — Course CRUD + status flow endpoints, sections/lessons/reorder endpoints, ownership guard, tests. Deps: T-02, T-05
- [ ] T-07 Nemotron — Public catalog: list with search/filter/sort/pagination, detail by slug. Deps: T-06
- [ ] T-08 Nemotron — UI: catalog + course detail page. Deps: T-04, T-07
- [ ] T-09 Nemotron — UI: instructor course builder (create course, sections, lessons, drag reorder). Deps: T-04, T-06
- [ ] T-10 ANY — `scripts/seed.ts`: users (1 admin, 3 instructors, 10 students), 20+ courses from the Kaggle Coursera/Udemy CSV, sections/lessons. Deps: T-06

## M2 — Video pipeline (hardest; do early)
- [x] T-11 MiMo — VideoAsset model, S3 presigned upload endpoints (`upload-url`, `complete`), S3 client wrapper with local-disk fallback. Deps: T-05
- [x] T-12 MiMo — BullMQ queue + transcode worker: FFmpeg to HLS (360p/720p + master playlist), progress updates, retries/backoff, failure state, separate `npm run worker` process. Deps: T-11
- [ ] T-13 MiMo — Playback endpoint: enrollment check, CloudFront signed cookies, local fallback streaming. Deps: T-12, T-06
- [ ] T-14 Nemotron — UI: video upload component (progress bar, status polling) in lesson editor. Deps: T-09, T-11
- [ ] T-15 Nemotron — UI: course player with `hls.js`, curriculum sidebar, resume position, mark-complete. Deps: T-13
- [ ] T-16 Human — Create S3 buckets + CloudFront distribution (OAC, key group) and fill env vars. Deps: T-12 working locally

## M3 — Enrollment, payments, earnings
- [ ] T-17 MiMo — Order + EarningsLedger + Payout models; Stripe Checkout creation; idempotent webhook creating Enrollment + ledger entry; free-course enroll; tests incl. replayed webhook. Deps: T-05, T-02
- [ ] T-18 Nemotron — Enrollment/progress services and endpoints (`/enrollments/mine`, `/courses/:id/progress`, `PUT /lessons/:id/progress`), tests. Deps: T-17
- [ ] T-19 Nemotron — UI: checkout button + success/cancel pages, My Learning page. Deps: T-17, T-08
- [ ] T-20 MiMo — Earnings service + endpoints (summary, by-course, monthly aggregation pipeline, transactions, payout request, admin mark-paid) with unit tests for fee math. Deps: T-17
- [ ] T-21 Nemotron — UI: instructor revenue dashboard (cards, monthly chart with Recharts, per-course table, payout request). Deps: T-20, T-04

## M4 — Quizzes
- [ ] T-22 Nemotron — Quiz model + CRUD, sanitized fetch for students, grading service (single/multi/truefalse), attempts endpoint, attempt limits, unit tests. Deps: T-06
- [ ] T-23 Nemotron — UI: quiz builder (instructor) and quiz taker with results screen. Deps: T-22, T-09
- [ ] T-24 Nemotron — Hook quiz pass into lesson completion + course progress recompute. Deps: T-22, T-18

## M5 — Live classes
- [ ] T-25 MiMo — LiveClass + ChatMessage models, CRUD/schedule/start/end endpoints, LiveKit token endpoint with host/student grants, tests for authorization. Deps: T-17 (enrollment check), T-02
- [ ] T-26 MiMo — Live room UI with `livekit-client` / `@livekit/components-react`: join, camera/mic, screen share (host), participant list, chat via data channel + persist via API. Deps: T-25, T-03
- [ ] T-27 Nemotron — UI: schedule live class form, upcoming classes list, "Join" button window logic. Deps: T-25, T-09

## M6 — Certificates
- [ ] T-28 Nemotron — Certificate service: pdfkit template (+ QR), S3 (or local) storage, idempotent issue on completion, download + public verify endpoints, tests. Deps: T-18, T-24
- [ ] T-29 Nemotron — UI: certificates page, verify page. Deps: T-28

## M7 — Admin, hardening, docs
- [ ] T-30 Nemotron — Admin: user management, course approval queue, payouts view, stats endpoint + UI. Deps: T-06, T-20
- [ ] T-31 MiMo — Security pass: rate limiting, helmet, CORS, input size limits, authorization audit on every route against API_CONTRACT, fix gaps. Deps: most of M1-M6
- [ ] T-32 Nemotron — Integration tests (supertest + mongodb-memory-server) for the happy path: register -> create course -> enroll -> quiz -> complete -> certificate. Deps: T-28
- [ ] T-33 ANY — Perf measurements -> `docs/RESULTS.md` (transcode time per minute of video, autocannon p95 on 3 endpoints, HLS time-to-first-frame, live class participant test). Deps: T-13, T-26
- [ ] T-34 ANY — README (setup, env, run, worker, seed, tests), `docs/architecture.md` with the Mermaid diagram exported to PNG, API docs from `API_CONTRACT.md`. Deps: all
- [ ] T-35 Human — Deploy (Render/Railway/Fly for API+worker, Vercel for client) or record the demo; 10-minute presentation; individual reflection.

## Suggested calendar (today is 30 Oct, deadline 20 Nov)
| Dates | Focus |
|---|---|
| 30 Oct - 1 Nov | M0 |
| 2 - 6 Nov | M1 + M2 (video is the riskiest, start it early) |
| 7 - 10 Nov | M3 + M4 |
| 11 - 14 Nov | M5 + M6 |
| 15 - 17 Nov | M7, perf numbers, bug fixing |
| 18 - 19 Nov | Deploy/demo recording, presentation, reflection |
| 20 Nov | Buffer and submission |

## Contract changes
(append lines: date, model, what changed, why)
- 2026-10-30, MiMo, added `GET /api/v1/health` (public liveness), T-01 — scaffold required a health route; contract did not cover it.
- 2026-10-30, MiMo, added `RATE_LIMITED 429` error code, T-02 — required for auth rate limiting.
- 2026-11-19, MiMo, `GET /api/v1/courses` documents `?includeComingSoon=true` (full catalog incl. coming-soon) and a server-computed `comingSoon` field (`lessonCount === 0`) on course payloads — catalog restore + single-source coming-soon logic.

## Dependencies added
(append lines: package, task ID, reason)
- express, T-01, HTTP server
- cors, T-01, CORS restricted to CLIENT_URL
- helmet, T-01, security headers
- mongoose, T-01, MongoDB ODM
- ioredis, T-01, Redis client (BullMQ later uses ioredis too)
- zod, T-01, env/request validation
- dotenv, T-01, load .env
- typescript, T-01, strict TS on root + server
- tsx, T-01, TS dev runner for server
- vitest, T-01, test runner
- supertest, T-01, HTTP tests
- @types/express, @types/cors, @types/supertest, @types/node, T-01, types
- eslint, @eslint/js, typescript-eslint, eslint-config-prettier, prettier, T-01, lint/format
- bcryptjs, T-02, password hashing (pure-JS implementation)
- jsonwebtoken, T-02, JWT auth
- @types/jsonwebtoken, T-02, types
- @aws-sdk/client-s3, T-11, AWS S3 client
- bullmq, T-12, task queue for transcoding

## Handoff log
(append lines when stopping mid-task: task ID, done, left, files touched, next command)
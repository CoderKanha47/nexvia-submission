# LMS with Live Classes

A full-stack Learning Management System with HLS video streaming, LiveKit live classes, auto-graded quizzes, PDF certificates, and Stripe payments with instructor revenue sharing.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite, Redux Toolkit + RTK Query, React Router v7, Tailwind CSS, Chart.js, hls.js, livekit-client
- **Backend:** Node.js + Express 5 + TypeScript, Mongoose (MongoDB), BullMQ + FFmpeg (video), pdfkit (certificates), Stripe, LiveKit Server SDK
- **Infrastructure:** Docker Compose (MongoDB, Redis, LiveKit), S3-compatible storage, CloudFront CDN

## Features

### Core
- **Roles:** Student, Instructor, Admin with JWT auth + RBAC
- **Courses:** Hierarchical curriculum (Course → Sections → Lessons), drag-drop reorder, status flow (draft → pending → published)
- **Video:** S3 presigned upload → BullMQ queue → FFmpeg → HLS (360p/480p/720p) → CloudFront/local delivery
- **Playback:** Enrollment-gated, CloudFront signed cookies, hls.js player with resume position
- **Quizzes:** Single/multi/true-false, auto-grading, attempt limits, progress integration
- **Live Classes:** LiveKit tokens, room join, camera/mic/screen share, data-channel chat
- **Certificates:** PDFKit generation, unique ID, public verification URL
- **Payments:** Stripe Checkout test mode, webhook handling, instructor earnings dashboard with Chart.js

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- (Optional) AWS credentials for S3/CloudFront
- (Optional) Stripe account for payments

### 1. Clone and Install
```bash
git clone <repo-url>
cd lms-with-liveclass
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings (see below)
```

### 3. Start Infrastructure
```bash
docker compose up -d
# Starts MongoDB (27017), Redis (6379), LiveKit (7880/7881)
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API
cd server && npm run dev

# Terminal 2: Video Transcode Worker
cd server && npm run worker

# Terminal 3: Frontend
cd client && npm run dev
```

### 5. Seed Database (Optional)
```bash
cd server && npx tsx ../scripts/seed.ts
```

### 6. Access
- **Frontend:** http://localhost:5173
- **API:** http://localhost:4000/api/v1
- **Health:** http://localhost:4000/api/v1/health
- **LiveKit:** ws://localhost:7880

## Easy Start/Stop (Windows)

For convenience, use the provided batch scripts:

```bash
# Start all services (Docker, Backend API, Video Worker, Frontend)
start.bat

# Stop all services
stop.bat
```

**What `start.bat` does:**
1. Starts Docker infrastructure (MongoDB, Redis, LiveKit)
2. Launches Backend API in a new window (`http://localhost:4000`)
3. Launches Video Transcode Worker in a new window
4. Launches Frontend dev server in a new window (`http://localhost:5173`)

**What `stop.bat` does:**
1. Stops all Node.js processes (Backend, Worker, Frontend)
2. Stops Docker containers
3. Cleans up any processes on ports 4000 and 5173

> **Note:** Each service runs in its own command window so you can see logs. Close those windows or run `stop.bat` to shut down.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `4000` | API port |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend URL for CORS |
| `MONGO_URI` | No | `mongodb://localhost:27017/lms` | MongoDB connection |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis for BullMQ |
| `JWT_ACCESS_SECRET` | **Yes** | - | JWT signing key (32+ chars) |
| `JWT_REFRESH_SECRET` | **Yes** | - | Refresh token key (32+ chars) |
| `AWS_REGION` | No | - | AWS region for S3 |
| `S3_UPLOAD_BUCKET` | No | - | S3 bucket for video uploads |
| `S3_HLS_BUCKET` | No | - | S3 bucket for HLS output |
| `S3_CERT_BUCKET` | No | - | S3 bucket for certificates |
| `CLOUDFRONT_DOMAIN` | No | - | CloudFront distribution domain |
| `CLOUDFRONT_KEY_PAIR_ID` | No | - | CloudFront key pair ID |
| `CLOUDFRONT_PRIVATE_KEY` | No | - | CloudFront private key (PEM) |
| `LIVEKIT_URL` | No | `ws://localhost:7880` | LiveKit server URL |
| `LIVEKIT_API_KEY` | No | `devkey` | LiveKit API key |
| `LIVEKIT_API_SECRET` | No | `secret` | LiveKit API secret |
| `STRIPE_SECRET_KEY` | No | - | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook signing secret |
| `STRIPE_TEST_MODE` | No | `true` | Use test mode fallback |
| `PLATFORM_FEE_PCT` | No | `20` | Platform fee percentage |
| `FFMPEG_PATH` | No | Auto (ffmpeg-static) | Custom FFmpeg binary path |
| `UPLOAD_DIR` | No | `data/uploads` | Local upload directory |
| `HLS_DIR` | No | `data/hls` | Local HLS output directory |
| `CERT_DIR` | No | `data/certificates` | Local certificate directory |

## Demo Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | password123 |
| Instructor 1 | instructor1@gmail.com | password123 |
| Instructor 2 | instructor2@gmail.com | password123 |
| Instructor 3 | instructor3@gmail.com | password123 |
| Student 1-10 | alice@gmail.com, alisha@gmail.com, bob@gmail.com, cathy@gmail.com, danny@gmail.com, debendra@gmail.com, kanha@gmail.com, krish@gmail.com, monty@gmail.com, zia@gmail.com | password123 |

## API Documentation

See [docs/API.md](docs/API.md) for complete endpoint reference.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagram and component overview.

## Testing

```bash
# Backend tests
cd server && npm run test

# Backend typecheck
cd server && npm run typecheck

# Frontend build (includes typecheck)
cd client && npm run build

# Lint
npm run lint
```

## Project Structure

```
lms-with-liveclass/
├── client/                 # React frontend
│   ├── src/
│   │   ├── app/           # Router, store, base API
│   │   ├── components/    # Shared components
│   │   ├── features/      # Feature modules (api, types, components)
│   │   └── pages/         # Route pages
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/        # Env, Mongo, Redis, Queue
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation, rate-limit
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helpers
│   │   ├── workers/       # BullMQ workers (FFmpeg)
│   │   └── tests/         # Unit tests (vitest)
│   └── package.json
├── scripts/                # Seed script
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── STATUS.md
│   ├── DECISIONS.md
│   ├── TEST_RESULTS.md
│   ├── PRESENTATION.md
│   └── REFLECTION.md
├── sample videos/          # Sample video clips (Pexels, free license)
├── docker-compose.yml
├── package.json            # Root workspace
└── .env.example
```

## Sample Videos

The `sample videos/` folder contains 3 short MP4 clips (~7-24 seconds each) sourced from [Pexels](https://www.pexels.com/) under the free license:

- `sample1.mp4` (~18 MB, ~7s) — Generic tech/education footage
- `sample2.mp4` (~29 MB, ~14s) — Code/development footage  
- `sample3.mp4` (~8 MB, ~24s) — Learning/study footage

These clips are processed **once** through the FFmpeg HLS pipeline (360p/480p/720p renditions, 2s segments) and then attached to lessons across the 4 live courses. The seed script is idempotent: it skips clips that have already been processed.

**To re-process videos:** Delete the `VideoAsset` documents in MongoDB and re-run the seed script, or run `npx tsx scripts/seed.ts` after clearing the `data/hls` directory.

## Video Pipeline Details

1. **Upload:** Instructor gets presigned S3 URL → uploads directly to bucket
2. **Complete:** Marks asset `queued` → BullMQ job enqueued
3. **Transcode:** Worker picks job → FFmpeg creates HLS (360p/480p/720p + master.m3u8)
4. **Progress:** Job updates asset `progressPct` in DB → UI polls
5. **Delivery:** On `ready`, HLS files uploaded to S3_HLS_BUCKET (or local)
6. **Playback:** Student requests `/lessons/:id/playback` → enrollment check → CloudFront signed cookies + manifest URL

## Live Class Flow

1. Instructor creates live class → gets room name
2. Student clicks "Join" → requests `/live-classes/:id/token`
3. Server validates enrollment → generates LiveKit JWT with role grants
4. Client connects to LiveKit → publishes camera/mic → subscribes to others
5. Chat via data channel → also persisted via API

## Payment Flow (Test Mode)

1. Student clicks "Enroll" → `GET /payments/courses/:id/checkout`
2. If free → auto-enroll; if paid → Stripe Checkout session (or demo URL)
3. On success → Stripe webhook `checkout.session.completed`
4. Webhook creates Enrollment + EarningsLedger (idempotent)
4. Instructor sees earnings in dashboard

## License

MIT
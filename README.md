# Nexvia Internship Submission: FS-02 and FS-03

Two full-stack projects from the Nexvia Full-Stack Development track, submitted in one repository.

| Project | What it is | Folder |
|---|---|---|
| **FS-02** | Real-time collaborative workspace (Notion-style) with live co-editing, presence, comments, version history and roles | [`FS-02-collab-workspace/`](./FS-02-collab-workspace) |
| **FS-03** | Learning management system with live classes, quizzes, certificates and instructor earnings | [`FS-03-lms/`](./FS-03-lms) |

Each folder is self-contained, with its own README (setup, run steps, features), `docs/`, tests and `.env.example`. Start with the project README of the one you want to run.

## Tech stack at a glance

| | FS-02 Collaborative Workspace | FS-03 LMS with Live Classes |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), TipTap editor, Yjs | React 19, TypeScript, Vite, Redux Toolkit + RTK Query, Tailwind CSS, Chart.js, hls.js, livekit-client |
| **Backend** | Next.js REST API and auth (NextAuth), custom WebSocket sync server (Yjs protocol) | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL with Prisma | MongoDB with Mongoose |
| **Realtime / queues** | Redis pub/sub across multiple sync instances, nginx load balancing | BullMQ + Redis, FFmpeg workers, LiveKit (WebRTC) |
| **Other** | y-indexeddb for offline editing | pdfkit certificates, Stripe (test mode), S3-compatible storage and CloudFront (optional) |
| **Infrastructure** | Docker Compose (Postgres, Redis, 2 sync servers, nginx, web) | Docker Compose (MongoDB, Redis, LiveKit) |

### Notes on stack choices

- FS-02 uses Next.js as a full-stack framework, so the UI, REST API and authentication live in one app, with a separate sync server for the real-time layer.
- FS-03 uses MongoDB with Mongoose for its data layer.

## FS-02: Collaborative Workspace

- **Live collaboration:** Yjs CRDTs over a custom WebSocket sync protocol, scaled across instances with Redis pub/sub
- **Rich text editor:** TipTap with slash menu, bubble toolbar and command palette
- **Presence:** live avatars and colored cursors, with click-to-follow
- **Comments:** threaded, with `@mentions`, quote anchors and resolve/reopen
- **Version history:** automatic and manual snapshots, with restore
- **Roles:** `OWNER / EDIT / COMMENT / VIEW`, enforced in the UI, REST API and sync server
- **Offline editing:** local persistence with automatic merge on reconnect
- **Workspaces:** nested pages, favorites, trash and restore, member management, invite links

Details and run steps: [`FS-02-collab-workspace/README.md`](./FS-02-collab-workspace/README.md)

## FS-03: Learning Management System

- **Roles:** student, instructor and admin, with JWT auth and role-based access control
- **Courses:** course, sections and lessons, with a draft, pending and published flow
- **Video pipeline:** upload, BullMQ job, FFmpeg HLS transcoding (360p/480p/720p), delivery through CloudFront or local storage
- **Quizzes:** auto-graded, with progress tracking
- **Live classes:** LiveKit rooms with camera, microphone, screen share and chat
- **Certificates:** PDF generation with a public verification URL
- **Payments:** Stripe Checkout in test mode, with instructor earnings dashboard (Chart.js)
- **Admin:** recent platform activity and purchase records

Details and run steps: [`FS-03-lms/README.md`](./FS-03-lms/README.md)

## Repository structure

```
.
├── README.md                      This file
├── FS-02-collab-workspace/
│   ├── apps/
│   │   ├── web/                   Next.js app: UI, REST API, auth
│   │   └── sync/                  WebSocket sync server
│   ├── packages/
│   │   ├── shared/                Permissions, message types, constants
│   │   └── db/                    Prisma schema, migrations, seed
│   ├── tests/                     Integration tests
│   ├── scripts/                   Smoke tests and load test
│   ├── infra/                     nginx config
│   └── docs/                      Architecture, API, test results, reflection
└── FS-03-lms/
    ├── client/                    React frontend
    ├── server/                    Express backend and BullMQ workers
    ├── scripts/                   Seed script
    ├── docs/                      Architecture, API, status, decisions, tests, reflection
    └── docker-compose.yml
```

## Quick start

Each project has full instructions in its own README. The short version:

### FS-02

```bash
cd FS-02-collab-workspace
npm install
cp .env.example .env
npm run db:deploy        # apply Prisma migrations
npm run db:seed          # demo users, workspace, pages
npm run dev              # web :3000 and sync :1234
```

Or run the full multi-instance stack with `docker compose up -d --build`.

### FS-03

```bash
cd FS-03-lms
npm install
cd server && npm install && cd ../client && npm install && cd ..
cp .env.example .env
docker compose up -d     # MongoDB, Redis, LiveKit
cd server && npm run dev          # terminal 1: API on :4000
cd server && npm run worker       # terminal 2: video worker
cd client && npm run dev          # terminal 3: frontend on :5173
cd server && npx tsx ../scripts/seed.ts   # optional: seed demo data
```

Demo accounts created by each seed script are listed in the project READMEs.

**Prerequisites for both:** Node.js 20+ and Docker with Docker Compose.

## Verification

```bash
# FS-02
cd FS-02-collab-workspace
npm run typecheck && npm run lint
npm run test -w tests              # integration tests (needs sync server, database and Redis)
node scripts/load-test.mjs         # concurrent clients converge

# FS-03
cd FS-03-lms
cd server && npm run test && npm run typecheck
cd ../client && npm run build
```

Recorded results are in each project's docs: `FS-02-collab-workspace/docs/test-results.md` and `FS-03-lms/docs/TEST_RESULTS.md`.

## Documentation

| | FS-02 | FS-03 |
|---|---|---|
| Architecture | `FS-02-collab-workspace/docs/architecture.md` | `FS-03-lms/docs/ARCHITECTURE.md` |
| API | `FS-02-collab-workspace/docs/` | `FS-03-lms/docs/API.md` |
| Test results | `FS-02-collab-workspace/docs/test-results.md` | `FS-03-lms/docs/TEST_RESULTS.md` |
| Reflection | `FS-02-collab-workspace/docs/` | `FS-03-lms/docs/REFLECTION.md` |
| Other | CRDT notes | `STATUS.md`, `DECISIONS.md`, `PRESENTATION.md` |

## Submission deliverables

| Deliverable | Where |
|---|---|
| Working demo | Recorded demo video in the Google Drive folder submitted with the form |
| Source code and commits | This repository |
| README and setup instructions | This file and each project's README |
| Architecture diagram and API docs | Each project's `docs/` folder |
| Test results | Each project's test results document |
| 10-minute presentation | Slides and video in the Drive folder |
| Individual reflection | Each project's `docs/` folder and the Drive folder |

## Known limitations

- **FS-03 video playback:** upload, the BullMQ job and FFmpeg HLS transcoding are implemented, but lesson video playback was unreliable at submission time. The recorded demo covers the guest, student and admin flows instead.
- **FS-03 payments** run in Stripe test mode only. No real payments are processed.
- **Optional cloud services** (S3, CloudFront, Stripe keys) need your own credentials. Without them, FS-03 falls back to local storage and a demo checkout.
- Secrets are never committed. Copy each `.env.example` to `.env` and fill in your own values.

## Author

Kanha ([@CoderKanha47](https://github.com/CoderKanha47))

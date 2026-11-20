# 10-Minute Presentation Outline

## LMS with Live Classes - Project Presentation

---

### Slide 1: Title (30s)
**LMS with Live Classes**
- Full-stack learning management system
- React + TypeScript, Node.js + Express, MongoDB
- HLS video, LiveKit live classes, Stripe payments, PDF certificates
- Team: [Your Name], Internship at Nexvia
- Date: 20 Nov 2026

---

### Slide 2: Problem Statement (1m)
**Why this project?**
- Online learning needs: video courses, live interaction, assessments, credentials
- Existing solutions: fragmented (separate video host, live tool, quiz tool, payment)
- Goal: unified platform with instructor revenue sharing
- Key challenges: video transcoding at scale, real-time WebRTC, secure content delivery

---

### Slide 3: Architecture Overview (1.5m)
**System Design**
```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   React     │────▶│  Express    │────▶│    MongoDB       │
│  (Client)   │     │  (API)      │     │  (Data)          │
└─────────────┘     └─────────────┘     └──────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌─────────┐ ┌─────────┐ ┌──────────┐
         │  Redis  │ │  BullMQ │ │  FFmpeg  │
         │ (Queue) │ │ (Jobs)  │ │ (Transcode)│
         └─────────┘ └─────────┘ └──────────┘
              │           │
              ▼           ▼
         ┌─────────┐ ┌──────────┐
         │ S3/Local│ │ LiveKit  │
         │ Storage │ │ (WebRTC) │
         └─────────┘ └──────────┘
```
- Monorepo: client + server workspaces
- TypeScript strict mode throughout
- RBAC: student, instructor, admin

---

### Slide 4: Core Features (2m)

| Feature | Implementation |
|---------|----------------|
| **Auth** | JWT + refresh token rotation, HttpOnly cookies, role guards |
| **Courses** | Hierarchical (course → sections → lessons), drag-drop reorder, status flow |
| **Video** | S3 presigned upload → BullMQ → FFmpeg → HLS (360p/480p/720p) → CloudFront/local |
| **Playback** | Enrollment check, CloudFront signed cookies, hls.js player, resume position |
| **Quizzes** | Multi-type (single/multi/true-false), auto-grading, attempt limits, progress hook |
| **Live Classes** | LiveKit tokens, room join, data-channel chat, host/student permissions |
| **Certificates** | PDFKit generation, unique ID, QR verify URL, idempotent on completion |
| **Payments** | Stripe Checkout test mode, webhook idempotency, earnings ledger, payout requests |
| **Dashboard** | Chart.js revenue charts, per-course earnings, transaction history |

---

### Slide 5: Technical Highlights (1.5m)

**Video Pipeline (Hardest Part)**
- Presigned S3 upload → BullMQ queue (concurrency 1, retries 2)
- FFmpeg transcodes to 3-rendition HLS ladder with master playlist
- Progress polling via job updates → database → UI
- CloudFront signed cookies for secure delivery (local fallback when no AWS)

**LiveKit Integration**
- Server-side token generation with role-based grants (canPublish for host)
- Data channel for chat persistence alongside WebRTC media
- Docker-compose dev server for local testing

**Payments & Revenue**
- Stripe Checkout with metadata for order tracking
- Idempotent webhook creates enrollment + earnings ledger atomically
- Platform fee calculation (20%), available balance tracking, payout workflow

**Certificate System**
- pdfkit template with student name, course, instructor, QR code
- Unique ID format: `LMS-2026-ABC123`
- Public verification endpoint for employers

---

### Slide 6: Challenges & Solutions (1.5m)

| Challenge | Solution |
|-----------|----------|
| **Video transcoding reliability** | BullMQ with retries, progress persistence, worker isolation |
| **Large file uploads** | Presigned S3 URLs (direct to bucket), local disk fallback |
| **Secure video delivery** | CloudFront signed cookies + enrollment check, local signed URLs fallback |
| **Real-time sync** | LiveKit server SDK for tokens, data channels for chat |
| **Payment idempotency** | Webhook processes checkout.session.completed once per session |
| **Progress consistency** | Single recompute function called from video, quiz, text completion |
| **Type safety** | TypeScript strict, Zod validation at route level, Mongoose schemas |

---

### Slide 7: Results & Demo Flow (1m)

**Demo Scenario:**
1. Register as instructor → Create course → Add sections/lessons
2. Upload video → Watch transcode progress → Publish course
3. Register as student → Browse catalog → Enroll (free/paid)
4. Watch video with resume → Take quiz → See progress update
5. Join live class → Chat with instructor
6. Complete course → Download certificate → Verify publicly
7. Switch to instructor → View revenue dashboard with Chart.js

**Current Status:**
- ✅ All backend APIs implemented and tested (38 tests passing)
- ✅ Frontend pages connected to real APIs
- ✅ Docker-compose for local dev (Mongo, Redis, LiveKit)
- ⚠️ AWS/Stripe keys needed for production features
- ⚠️ Seed data & perf measurements pending

---

### Slide 8: Next Steps (30s)

**Immediate (Post-submission)**
- Add AWS S3 + CloudFront credentials for production video delivery
- Configure Stripe live keys and webhook endpoint
- Run seed script with sample videos (Big Buck Bunny, Sintel)
- Performance benchmarks with autocannon
- Integration tests for critical paths

**Future Enhancements**
- Mobile app (React Native)
- Discussion forums per lesson
- AI-powered quiz generation from video transcripts
- SCORM/xAPI export for enterprise
- Multi-language support
- Advanced analytics (cohort analysis, funnel)

---

### Slide 9: Thank You (30s)

**LMS with Live Classes** - Complete learning platform

**Tech Stack:** React, Node.js, MongoDB, Redis, BullMQ, FFmpeg, LiveKit, Stripe

**Repository:** [GitHub URL]

**Questions?**
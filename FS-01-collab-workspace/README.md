# Nexvia — Real-Time Collaborative Workspace

A production-quality mini-Notion: nested pages, live co-editing, offline support,
comments with @mentions, and version history — built with Next.js 14, Yjs,
TipTap, PostgreSQL and Redis.

## Feature checklist

- [x] **Live collaboration** — Yjs CRDTs over a custom WebSocket sync protocol,
  multi-instance via Redis pub/sub, load-balanced by nginx (least-connections)
- [x] **Rich text editor** — TipTap (headings, lists, tables, tasks, code,
  images, links, highlights)
- [x] **Slash menu** — `/` opens 14 block commands with keyboard navigation
- [x] **Bubble toolbar** — selection formatting + comment action
- [x] **Command palette** — `Cmd/Ctrl+K`: page search, new page, theme, navigation
- [x] **Presence** — live avatars, colored cursors, click-to-follow mode
- [x] **Comments** — threaded discussion, `@mentions` with autocomplete, quote
  anchors highlighted in the editor, resolve/reopen
- [x] **Version history** — auto + manual snapshots, restore with epoch bump
  (connected clients reload automatically; pre-restore state kept for undo)
- [x] **Roles** — `OWNER / EDIT / COMMENT / VIEW` enforced in UI, REST API and
  the sync server (write-gating before CRDT apply)
- [x] **Offline editing** — y-indexeddb persistence, browser online/offline
  awareness, automatic merge on reconnect
- [x] **Workspaces** — nested page tree, favorites, trash/restore, duplicate,
  drag reorder, member management, invite links
- [x] **Auth** — NextAuth credentials (JWT strategy) + registration
- [x] **Theming** — light/dark/system, Montserrat, `Cmd/Ctrl+Shift+L`
- [x] **Docker Compose** — postgres, redis, 2× sync server, nginx, web

## Quick start

**Windows (quickest):** double-click `START.BAT` — it does everything below
(env, install, build, migrations, seed, postgres/redis via Docker, then opens
consoles for sync + web) and prints health checks when ready. `STOP.BAT`
stops the dev consoles and all compose services (data volumes kept).
`START.BAT /full` additionally starts sync1 + sync2 + nginx on `:4000`
(needed by the cross-instance smoke/load tests).

```bash
npm install
cp .env.example .env         # adjust secrets for anything non-dev
npm run db:deploy            # apply Prisma migrations
npm run db:seed              # demo users, workspace, pages
npm run dev                  # web :3000 + sync :1234 together
# or separately:
npm run dev -w apps/sync     # ws://localhost:1234
npm run dev -w apps/web      # http://localhost:3000
```

Demo users (password `password123`):

| User | Role in "Acme HQ" |
|------|-------------------|
| alice@demo.dev | OWNER |
| bob@demo.dev | EDIT |
| carol@demo.dev | COMMENT |

### Docker (full stack, 2 sync instances + nginx)

```bash
docker compose up -d --build
# web     → http://localhost:3000
# sync    → ws://localhost:4000 (nginx → sync1/sync2, least_conn)
```

## Repository layout

```
apps/
  web/       Next.js 14 app (App Router) — UI + REST API + auth
  sync/      WebSocket sync server (Yjs protocol, awareness, persistence)
packages/
  shared/    Permissions, WS message types, bus events, constants
  db/        Prisma schema, migrations, seed
tests/       Vitest integration tests (convergence, roles, offline)
scripts/     Smoke tests + load test (phase2/7/8/9, load-test)
docs/        Architecture, API, CRDT notes, test results, reflection
infra/       nginx.conf for the multi-instance sync tier
```

## Verification

```bash
npm run typecheck && npm run lint     # both apps + packages
npm run test -w tests                 # 6 integration tests (needs sync + db + redis)
node scripts/smoke-phase7.mjs         # comments API
node scripts/smoke-phase8.mjs         # version save/restore (edits via sync)
node scripts/smoke-phase9.mjs         # cross-instance convergence via nginx
node scripts/load-test.mjs            # 25 concurrent clients converge
```

See `docs/test-results.md` for recorded results and `docs/architecture.md` for
how the pieces fit together.

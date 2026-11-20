================================================================================
Readme-Recommended.txt
Nexvia Internship Project — "Real-Time Collaborative Workspace" (mini Notion)
================================================================================

--------------------------------------------------------------------------------
1. ABOUT THIS APP
--------------------------------------------------------------------------------

A production-style, real-time collaborative workspace inspired by Notion. Teams
create workspaces, write documents together in a shared rich-text editor, and
see each other's cursors and selections live — like Google Docs, but for notes
and wikis.

Core ideas:
  - Every workspace contains a tree of pages (create / rename / duplicate /
    delete / drag-and-drop reorder / favorite).
  - Every page is a CRDT document (Yjs): all edits from all connected users
    merge deterministically, with no "last write wins" data loss.
  - Multi-user collaboration: live cursors, presence avatars, follow-mode
    (follow what a teammate is editing), inline comments with @mentions, and
    version history with one-click restore (restore = new version + epoch bump,
    never overwrites the past).
  - Permission model: OWNER > EDITOR > COMMENTER > VIEWER, enforced in the UI,
    the REST API, and the WebSocket sync server (comment-only users cannot
    write document updates; viewers cannot edit at all).
  - Offline-first: edits are kept locally (IndexedDB) and automatically
    synced when the connection returns; soft reconnection with backoff and
    token refresh; per-epoch document namespaces so restoring an old version
    cannot poison the local cache.
  - Light / dark / system theme (Ctrl/Cmd+Shift+L), command palette
    (Ctrl/Cmd+K), slash menu, bubble formatting toolbar.

Demo users: alice@demo.dev (OWNER), bob@demo.dev (EDITOR),
carol@demo.dev (COMMENTER) — password: password123

Project layout (npm workspaces monorepo):
  apps/web        — Next.js web app (UI + REST API + NextAuth)
  apps/sync       — custom WebSocket sync server (Yjs rooms, Redis bus)
  packages/shared — constants shared by web and sync (WS message types, etc.)
  packages/db     — Prisma schema, migrations, idempotent seed
  tests           — integration tests (Vitest + Playwright)
  scripts         — smoke scripts, load test, START.BAT / STOP.BAT
  docs            — architecture, API, CRDT notes, test results, presentation

--------------------------------------------------------------------------------
2. TECH STACK USED
--------------------------------------------------------------------------------

Frontend
  - Next.js 14.2 (App Router), React 18, TypeScript
  - Tailwind CSS 3.4 (design tokens, light/dark via next-themes)
  - TipTap v2.27 editor (ProseMirror) + Tiptap collab/cursor extensions
  - Yjs (CRDT), y-websocket (client transport), y-indexeddb (offline)
  - dnd-kit (drag-and-drop page tree), framer-motion (micro-animations)
  - lucide-react icons, react-hook-form + zod
  - next/font/google — Montserrat (CSS variable --font-montserrat)

Backend / Data
  - Next.js Route Handlers (REST) under apps/web/src/app/api/**
  - NextAuth v4 (credentials provider, JWT sessions)
  - Prisma ORM 5.22 + PostgreSQL (Docker: nexvia-postgres-1)
  - Redis (Docker: nexvia-redis-1) — base64-encoded room payloads + event bus
    (flush, doc:reset, perm:changed, page/comment/version:changed)

Sync layer
  - Custom WebSocket server (apps/sync), Node "ws" + y-protocols
  - Message types: 0=sync, 1=awareness, 127=custom JSON (WS_MESSAGE_CUSTOM)
  - Rooms: "page:{pageId}:e{epoch}"; JWT HS256 auth (WS_TOKEN_SECRET)
  - Multi-instance: sync1/sync2 (4001/4002) behind nginx (4000) with Redis
    pub/sub so two server processes still converge

Tooling / QA
  - npm workspaces, tsx (dev runners), ESLint + tsc --noEmit (gates)
  - Vitest integration tests (6 tests: sync, offline/persistence)
  - Playwright chromium — browser smoke script (login → edit → reload →
    connected status → tooltips → sidebar navigation)
  - Load test script (scripts/load-test.mjs)
  - Windows quick start: START.BAT / STOP.BAT (full local stack)

--------------------------------------------------------------------------------
3. INITIAL BUILD FEATURES
--------------------------------------------------------------------------------

Phases 1–11 of the build (each phase committed):

  Phase 1  Monorepo scaffold, Prisma schema, migrations, idempotent seed
           (users / workspace "Acme HQ" / pages / comments / versions)
  Phase 2  Auth (NextAuth credentials + JWT), API helpers, demo users
  Phase 3  Workspace UI shell: sidebar tree, home, settings, members,
           command palette wiring, theming (light/dark/system + shortcut)
  Phase 4  WebSocket sync server (rooms, JWT, persistence to Postgres),
           collaborative editor with live cursors + presence, integration tests
  Phase 5  Slash menu, bubble toolbar, editor UX polish
  Phase 6  Presence panel, avatars, follow mode
  Phase 7  Inline comments: threads, replies, @mentions, comments panel
  Phase 8  Version history: periodic/interval snapshots, restore (epoch bump),
           epoch-guarded saves and room routing
  Phase 9  Early-message buffering (messages before room load), Docker +
           OpenSSL dev-cert fixes, multi-instance sync behind nginx
  Phase 10 Offline editing (y-indexeddb), auto-reconnect, offline/reconnect
           integration test
  Phase 11 Docs suite: README, docs/architecture.md, api.md, crdt-notes.md,
           test-results.md, presentation-outline.md, reflection.md

--------------------------------------------------------------------------------
3.1 BUGS  (found during build, testing, and browser QA of the initial build)
--------------------------------------------------------------------------------

[B-01] Login redirect loop ("bouncing" between /login and /)
  Cause:  A Phase-1 stub page at app/page.tsx unconditionally ran
          redirect('/login') and shadowed the real dashboard at
          (app)/page.tsx — the dashboard had literally never rendered.
  Symptom: Every authenticated visit to "/" bounced back to /login.
  Found:   Manual browser testing after Phase 11.

[B-02] Editor crashed: "Cannot read properties of null (reading 'awareness')"
  Cause:  CollaborationCursor.configure({ user }) was missing the
          provider option; the extension then dereferenced
          provider.awareness on null.
  Symptom: Every page with the editor threw a runtime error.

[B-03] Connection pill stuck on "Syncing" forever (not realtime)
  Cause:  y-websocket emits the sync event as emit('sync', [state]) — the
          handler received a bare boolean / 1-element array, but
          onSyncEvent read a fixed { synced } shape. event.synced was
          undefined, so "connected && !synced" mapped to 'syncing' until a
          full reload (and even then only briefly).
  Symptom: Indicator never reached "Connected"; changes did sync, only the
           status display lied.

[B-04] Sidebar page tree clicks did nothing (could not switch pages)
  Cause:  AppShell passed its no-arg onNavigate (which only closes the
          mobile drawer) straight into PageTree. Rows called
          onNavigate(pageId) — the id was ignored, router.push() never ran.
  Symptom: Clicking a page in the tree never navigated. Favorites and
           Home/Settings still worked (they have their own router.push).

[B-05] Binary data corrupted over Redis pub/sub (multi-instance split brain)
  Cause:  ioredis pub/sub does not round-trip Buffers safely for Yjs
          messages. Room payloads arrived corrupted between sync1/sync2.
  Symptom: Two server processes never converged; tests failed only in
           multi-instance mode.

[B-06] Integration tests: y-websocket "sync" event payload shape
  Cause:  Same as B-03 — array payloads; test helpers read event.synced
          and always saw undefined.
  Symptom: Assertions about sync state flaked/failed.

[B-07] First messages lost on connect (race before room load)
  Cause:  The sync server attached ws.on('message') only after the async
          room (Postgres) load finished; messages arriving in that window
          were dropped → first user sometimes saw no content until reload.
  Symptom: Occasional blank editor on first connection.

[B-08] Server wrote pre-authorization (sync sub-type gating)
  Cause:  The sync message sub-type (update vs step) was parsed multiple
          times / not gated, so a COMMENTER/VIEWER update could reach the
          room before permission checks.
  Symptom: Read-only users could (in edge cases) write.

[B-09] Console flooded with "Unable to compute message" on every page
  Cause:  Custom type-127 frames (WS_MESSAGE_CUSTOM JSON) hit y-websocket's
          generic decoder.
  Symptom: Harmless but noisy console errors in the browser; masked real
           errors.

[B-10] Stale IndexedDB namespace after version restore
  Cause:  Restore bumps Page.epoch (new room), but the IndexedDB doc
          namespace did not change → stale pre-restore content re-merged.
  Symptom: After restore, old text could "ghost" back on reload.

[B-11] `next build` while dev server ran corrupted .next (page hangs)
  Cause:  Dev and build writing .next simultaneously.
  Symptom: Port 3000 listened but never responded.

[B-12] Stale generated route types after deleting app/page.tsx
  Cause:  .next/types/app/page.ts still described the deleted route →
          tsc --noEmit failed after the B-01 fix.
  Symptom: typecheck errors referencing a file that no longer exists.

[B-13] Playwright login flake: native form GET instead of NextAuth POST
  Cause:  Clicking "Sign in" before React hydration submitted the HTML
          form natively (URL became /login?email=...).
  Symptom: Smoke login failed intermittently.

[B-14] STOP could not kill `tsx watch` (respawns killed children)
  Cause:  tsx watch restarts its child when it dies; killing the leaf PID
          only caused a respawn on the same port.
  Symptom: Ports stayed occupied after "stopping" the stack.

[B-15] `timeout` command unavailable/fails under redirected stdin (Windows)
  Cause:  timeout.exe errors when stdin is not a console (piped output).
  Symptom: START.BAT health-wait loops aborted.

[B-16] Seed could not detect existing data via SQL (PascalCase tables)
  Cause:  Prisma models have no @@map, so tables are "User"/"Page" (quoted
          PascalCase); the planned SQL guard was fragile.
  Symptom: Risk of duplicate seed data on repeated runs.

--------------------------------------------------------------------------------
3.2 PATCHES AND UPDATES  (what was shipped to fix the initial build)
--------------------------------------------------------------------------------

[P-01] (B-01) Deleted the stub app/page.tsx; "/" now serves the real
       dashboard (app)/page.tsx. Login page became an async server
       component: getServerSession(authOptions) → redirect('/') when a
       session already exists (no bounce loop either direction).
       Gate: unauthenticated / → 307 /login; authed / → 200 dashboard;
       authed /login → 307 /.

[P-02] (B-02) CollaborationCursor.configure({ provider: handle.provider,
       user: cursorUser }) in CollabEditor.tsx. No more awareness crash.

[P-03] (B-03/B-06) collab.ts now normalizes event payloads defensively:
       resolveSynced() and resolveStatus() accept boolean, 1-element
       array, or {synced}/{status} object before feeding emit().
       The pill genuinely reaches Connected (asserted in the smoke test).

[P-04] (B-04) AppShell now passes a real handler into PageTree:
       onNavigate(pageId) → close drawer + router.push
       (/w/{workspaceId}/p/{pageId}). Verified in browser: clicking a
       sidebar row navigates and remounts the editor (key = id:epoch).

[P-05] (B-05) Room payloads are base64-encoded across Redis pub/sub; bus
       events are JSON (flush/flush-ack, doc:reset, perm:changed,
       page:changed, comment:changed, version:changed).

[P-06] (B-07) Sync server registers the message listener BEFORE the async
       room load and buffers + replays messages that arrive early.

[P-07] (B-08) Sync sub-type is read once, manually, and writes are gated
       until room state + permissions are applied; role checks run again
       on the parsed update.

[P-08] (B-09) collab.ts wraps each ws.onmessage (patchSocketForCustomFrames):
       type-127 frames are dropped before y-websocket's decoder (re-patched
       on every 'status' event, removed in destroy). The browser still
       acts on custom doc:reset / perm changes via close codes 4410/4403.

[P-09] (B-10) Per-epoch IndexedDB namespaces; restores bump epoch so both
       server room and local doc namespace rotate. Saves are guarded with
       WHERE pageId AND epoch (no cross-epoch overwrites). Close codes:
       401/4401/4403 auth, 409/4410 stale epoch (client refetches),
       4429 rate limit.

[P-10] (B-11/B-12) STOP.BAT / START.BAT workflow; advice: never run
       `next build` next to a live dev server; delete apps/web/.next to
       repair; stale .next/types files removed after route deletions.

[P-11] (B-13) scripts/smoke-browser.mjs retries login only after observing
       the POST /api/auth/callback/credentials request (hydration-safe).

[P-12] (B-14/B-15) STOP.BAT kills via recorded .dev-*.pid files (PID
       identity verified through Get-CimInstance CommandLine), then does
       two ancestor-walk sweeps of ports 3000/1234 (node/cmd parents,
       taskkill /t), using `ping -n 2 127.0.0.1` as sleep. Volumes are
       kept (docker compose stop, not down).

[P-13] (B-16) Seed is fully idempotent (upserts + existence guards), so
       START.BAT can run db:seed on every boot without duplicating data.

[P-14] UX extras from browser QA: native hover tooltips (title=) added to
       the header icons — Favorite ("Add/Remove from favorites"), Comments
       ("Show/Hide comments"), Version history ("Show/Hide version
       history"); ConnectionStatus pill already had a title.

[P-15] Verification gates established:
       - npm run typecheck (tsc --noEmit) — clean
       - npm run lint (next lint) — clean
       - tests: 6/6 integration (sync + offline)
       - node scripts/smoke-browser.mjs — PASS with regression checks:
         login → new page → type → reload persistence → status pill
         reaches Connected → tooltips present → sidebar row click
         navigates to a different page
       - scripts/smoke-phase2/7/8/9.mjs and scripts/load-test.mjs — PASS
       - START.BAT / STOP.BAT full start/stop cycles tested

--------------------------------------------------------------------------------
4. NEXT UPDATE FEATURES
--------------------------------------------------------------------------------

Planned for the next iteration:

  - Share links: signed, view-only URLs for a single page (API route +
    "Share" dialog, expiry/role options). Currently members are invited
    per-workspace only.
  - Realtime comments: push comment/thread/version events over the existing
    Redis bus to connected clients instead of the 10-second panel poll;
    live thread updates and toasts.
  - Full-text search across pages (Postgres FTS) surfaced in the command
    palette (Ctrl/Cmd+K already lists navigation targets).
  - Presence polish: follow-mode indicator on the followed user's avatar,
    "someone is editing this paragraph" highlight, awareness color
    preferences.
  - Import/export: Markdown import/export per page (TipTap markdown
    serializer).
  - Notifications: @mention inbox (DB table + polling or bus event).
  - Playwright E2E suite in CI (two-browser multi-user presence test,
    comment thread flow, version restore flow) building on
    smoke-browser.mjs.
  - Docker "full stack" image for the web app (nginx route to the Next.js
    container so `start.bat /full` serves everything on :4000).
  - Performance: code-split history/comments panels, virtualize very long
    page trees, page-level pagination for large workspaces.

--------------------------------------------------------------------------------
4.1 BUGS  (known limitations and likely bug candidates for the next cycle)
--------------------------------------------------------------------------------

[N-01] Comment panel polls every 10s — a teammate's new comment appears
       late; no live event (documented limitation, not a crash).
[N-02] Share links do not exist at all (feature gap that presents as a bug
       for users expecting a "Share" button).
[N-03] Web is not started by `start.bat /full` (only sync1/sync2/nginx on
       :4000) — the Docker path serves the API/sync but not the Next.js UI
       unless started separately.
[N-04] No automated multi-browser presence test — cursor/follow regressions
       can only be caught manually today.
[N-05] Large workspace trees are rendered fully (no virtualization); a few
       thousand pages would degrade sidebar responsiveness.
[N-06] IndexedDB data accumulates across epochs (old namespace docs are
       kept); heavy restore history can grow local storage.
[N-07] WS token expiry mid-session: token refresh exists, but a long-idle
       tab that reconnects exactly at expiry may need one extra retry.
[N-08] Multi-instance session stickiness: presence/awareness through nginx
       relies on the Redis bus; awareness fan-out timing can lag by a few
       hundred ms under load.
[N-09] Room payloads in Redis are pruned on flush ack — a crash between
       write and ack could momentarily serve a stale snapshot (Postgres is
       the durable source; next write re-bases).
[N-10] `next build` next to a running dev server still corrupts .next
       (process problem, not code) — anything automated must respect this.
[N-11] Seed "Getting Started" page was soft-deleted during API testing and
       is absent from test fixtures that reference it (data state, not code).
[N-12] ESLint/tsc runs can appear to hang under file-lock contention when
       dev server + tests run simultaneously (retry; not a code defect).

--------------------------------------------------------------------------------
4.2 FIXES  (planned remediations for 4.1)
--------------------------------------------------------------------------------

[F-01] (N-01) Emit comment:changed / version:changed on the Redis bus from
       API mutations; CommentsPanel subscribes via the sync socket
       (WS_MESSAGE_CUSTOM type 127) and invalidates instantly. Remove poll.
[F-02] (N-02) POST /api/pages/{id}/share → signed share token (JWS, exp),
       GET /s/{token} read-only view route enforcing VIEWER role in both
       REST and the sync server (reuse the existing share-token room scope
       already covered by an integration test).
[F-03] (N-03) Add a web container to docker-compose and an nginx location
       / → web:3000 in the /full profile; START.BAT health-check :4000.
[F-04] (N-04) Playwright multi-page test: two contexts, same page, assert
       remote cursor text sync within 5s + follow-mode target lock; wire
       into `npm test` as a separate tagged project.
[F-05] (N-05) Flatten + window the tree render (visible-nodes list with
       simple virtualization), memoize rows, keep dnd-kit to visible range.
[F-06] (N-06) On destroy, drop IndexedDB stores of non-current epochs
       (keep only current epoch namespace); optional storage estimation
       warning before savepoints pile up.
[F-07] (N-07) Proactive re-auth: refresh WS token 60s before exp while a
       provider is connected (single timer, reuse existing refresh path).
[F-08] (N-08) Publish awareness diffs through the same Redis channel with
       sequence numbers; add backpressure (coalesce at 50ms) — already have
       the bus plumbing.
[F-09] (N-09) Write-through: persist to Postgres first, ack flush, then
       prune Redis snapshot; make prune conditional on ack generation.
[F-10] (N-10) Keep STOP.BAT/START.BAT as the guard; additionally detect a
       running dev server in `build:*` scripts and refuse with a clear
       message.
[F-11] (N-11) Re-run seed with an explicit restore path (upsert by slug) or
       un-delete the demo page in dev data; smoke tests already avoid
       hardcoding page titles (click any non-active row).
[F-12] (N-12) Run lint/typecheck sequentially before tests in CI; add a
       combined `verify` script (typecheck → lint → tests → smoke).

--------------------------------------------------------------------------------
5. POSSIBLE BREAKDOWNS / POSSIBLE ERRORS AND POSSIBLE SOLUTIONS
--------------------------------------------------------------------------------

[BC-01] "Port 3000/1234 already in use" or START says stack is up but the
        app does not respond.
  Cause:  Leftover dev processes (tsx watch respawns) or a hung dev server.
  Fix:    Run STOP.BAT (kills pid-file trees + ancestor-walk port sweep),
          then START.BAT again. If .next is in a bad state (server listens,
          never answers), close dev, delete apps\web\.next, restart.

[BC-02] Postgres/Redis fail to start; docker health check loops.
  Cause:  Docker Desktop not running, or a stale container from a previous
          compose project.
  Fix:    Start Docker Desktop; `docker ps` to confirm; if a container is
          unhealthy: `docker compose restart postgres redis`. Volumes are
          preserved by STOP (stop ≠ down), so data survives.

[BC-03] .env missing or WS auth fails (WS close 401/4401, pill stays
        "Connecting").
  Cause:  WS_TOKEN_SECRET differs between web and sync, or .env was not
          generated, or the WS token expired (>15 min idle, refresh failed).
  Fix:    START.BAT copies .env from .env.example when absent; ensure the
          SAME .env is loaded by both apps (restart both after edits); check
          server clock skew; reconnect once — collab.ts refreshes the token
          automatically.

[BC-04] Login loop or "Session expired" instantly after logging in.
  Cause:  Browser cookies blocked/stale, or an old stub page reappeared, or
          system clock skew breaks JWT nbf/exp.
  Fix:    Clear site cookies for localhost:3000; verify no file exists at
          apps/web/src/app/page.tsx (the dashboard must live at
          app/(app)/page.tsx); fix system clock; re-run the browser smoke to
          confirm 307/200 behavior.

[BC-05] Editor shows "Offline — changes saved locally" forever / edits not
        visible to the other user.
  Cause:  Sync server down (port 1234), blocked WebSocket, or multi-instance
          deployment without Redis (split brain), or epoch mismatch (4410).
  Fix:    Check /healthz on :1234; ensure redis is up for multi-instance;
          page showing stale epoch → hard reload (server responds 4410/409,
          client refetches and remounts with key id:epoch).

[BC-06] Two users editing but content diverges (multi-instance).
  Cause:  Redis pub/sub carrying raw Buffers (binary corruption) — the
          regression the base64 patch fixed.
  Fix:    Ensure you are on the patched build; keep room payloads base64;
          verify with `node scripts/load-test.mjs` / integration tests
          (they fail loudly if payloads corrupt).

[BC-07] View-only user can type / comment-only user's edits persist.
  Cause:  Sync sub-type gating regression (B-08) or a client that ignores
          role changes without a reconnect.
  Fix:    Re-run "drops write updates from comment-only users" integration
          test; role revocation publishes perm:changed → clients are closed
          with 4403 and refetch permissions.

[BC-08] Restore version did not really restore (old text reappears).
  Cause:  IndexedDB epoch namespace not rotated, or a second client on the
          old room wrote back.
  Fix:    Confirm epoch bump (save guarded by WHERE pageId AND epoch);
          stale client gets 4410 → refetch → new namespace; as a last
          resort clear site data (IndexedDB) for localhost.

[BC-09] Playwright smoke: "credentials callback never fired".
  Cause:  Click raced React hydration (pre-hydration native form submit).
  Fix:    Already handled in smoke-browser.mjs (retry until the POST
          /api/auth/callback/credentials is observed). If it persists, bump
          the initial wait / networkidle wait; make sure dev server finished
          compiling (first hit is slow).

[BC-10] Playwright smoke: sidebar navigation failed / row not found.
  Cause:  The clicked page was soft-deleted (tree row absent) or the tree
          had not loaded yet.
  Fix:    Smoke now clicks any aria-selected="false" row inside the
          [role="tree"] (auto-waits for load). Avoid hardcoding titles.

[BC-11] "Unable to compute message" in test/browser consoles.
  Cause:  Custom type-127 frames hitting y-websocket's binary decoder.
  Fix:    Expected in raw test clients (they subscribe to 127 themselves);
          in the app this is filtered by patchSocketForCustomFrames — if it
          reappears, the 'status' event re-patch wrapper was lost (check
          destroy/reconnect path).

[BC-12] STOP.BAT does not free a port.
  Cause:  The process was started outside START.BAT (no pid file) or under
          a parent the sweep does not recognize.
  Fix:    STOP sweeps ports twice with a 2s gap and walks ancestors
          (node/cmd) — run it again; otherwise find the PID:
          Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess, then
          taskkill /PID <id> /F /T.

[BC-13] SQL/psql queries fail with "role nexvia does not exist" or quoted
        identifier errors (PowerShell).
  Cause:  Wrong DB role; PowerShell mangles double quotes in -c strings.
  Fix:    Use role `workspace` / db `workspace` (see .env DATABASE_URL),
          container `nexvia-postgres-1`, and pipe a .sql file:
          Get-Content q.sql | docker exec -i nexvia-postgres-1 psql -U
          workspace -d workspace

[BC-14] Prisma migrate/seed failures on a fresh machine.
  Cause:  Migrations not applied yet, or DB unreachable.
  Fix:    START.BAT already runs db:deploy + idempotent db:seed after
          Postgres is healthy; manually: `npm run db:deploy -w packages/db`
          then `npm run db:seed -w packages/db`. Seed is safe to re-run.

[BC-15] Load test / integration tests fail only when run together.
  Cause:  Port contention (dev stack on 1234 vs tests' own server), file
          locks on .next, or non-unique test markers colliding.
  Fix:    Tests spin their own sync server on a free port and use unique
          per-run markers (offline test); stop dev or run suites
          sequentially (`npm run verify` order: typecheck → lint → test →
          smoke).

================================================================================
Quick verification checklist (should all pass on a healthy checkout):

  1. start.bat            → web :3000, sync :1234, postgres, redis healthy
  2. npm run typecheck    → clean
  3. npm run lint         → clean
  4. npm test  (tests)    → 6/6
  5. node scripts/smoke-browser.mjs
                           → PASS (login, edit, reload, Connected pill,
                             tooltips, sidebar navigation)
  6. start.bat /full       → also sync1/sync2 + nginx :4000
  7. stop.bat              → ports 3000/1234 free, containers stopped
================================================================================

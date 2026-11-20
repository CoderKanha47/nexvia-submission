# Presentation Outline — Nexvia Collaborative Workspace

Target: ~10–12 minute demo + 3 minutes of Q&A prep.

---

## 1. Hook & problem (1 min)

- Docs are where teams think — but real-time collaboration looks easy until
  you ship it: offline edits, conflicting changes, permissions, history.
- **Goal**: a Notion-like workspace where a page edits itself into one truth
  across many users, even offline, even across multiple sync servers —
  without ever silently overwriting someone's work.

## 2. What was built (2 min)

Live tour (30 seconds each, one browser window + second browser/incognito):

1. **Auth & workspaces** — login as `alice@demo.dev` / `password123`,
   sidebar with pages, favorites, trash.
2. **Collaborative editor** — Alice and Bob open the same page; type in
   both, watch cursors and text converge (TipTap + Yjs).
3. **Slash menu** (`/`), **bubble toolbar** (selection), **command palette**
   (`Ctrl/Cmd+K`) — the fast-editing surface.
4. **Comments** — select text → comment bubble button → thread with
   `@mention` autocomplete → resolve/reopen; highlighted range in the doc.
5. **Version history** — save a version, edit further, restore: document
   snaps back, everyone connected reloads into the new version.
6. **Offline** — kill the network (or DevTools offline), keep typing, come
   back; edits merge. (Status pill shows offline → reconnecting → synced.)
7. **Roles** — open the page as a `VIEW` user: editing affordances gone,
   and a server-side attempt to write is rejected anyway.

## 3. Architecture (2 min)

Mermaid diagram from `docs/architecture.md`:

- **Next.js web** — app shell, REST API with role gates, NextAuth JWT.
- **Sync server (apps/sync)** — WebSocket, one `Y.Doc` per
  `(pageId, epoch)` room, debounced persistence to Postgres.
- **Redis** — pub/sub fan-out between sync instances + control bus
  (flush, doc:reset, perm:changed).
- **nginx** — `least_conn` WebSocket load balancing across 2+ sync
  instances (demo: `curl localhost:4000/healthz` alternates instances).
- **Postgres** — users, workspaces, pages, comments, versions, doc state.
- **Browser** — `y-indexeddb` offline cache.

**Key line**: the document lives in Postgres for durability, in Redis for
live sharing, and in the browser for offline — Yjs keeps all three
convergent.

## 4. The three hard problems (3 min)

### a) Conflict-free editing (CRDTs)
- Every keystroke is an immutable operation; convergence is guaranteed by
  the Yjs algorithm, not by locking.
- Wire protocol implemented from scratch: sync step1/step2 + updates,
  awareness channel for cursors.
- Demo evidence: `npm run test` → two clients editing concurrently produce
  byte-identical text.

### b) Multi-instance scale
- One in-memory doc per room per instance; Redis relays every applied
  update (`base64` — binary through ioredis would corrupt).
- Cross-instance smoke: 4 clients on sync1+sync2, one marker, all see it.

### c) Permissions + history that can't be violated
- CRDT updates are not inspectable after merge → the server reads the sync
  sub-type **before** applying and drops writes from COMMENT/VIEW sockets.
- Versions: snapshots are content-hashed (no duplicates); restore can't be
  "rewound" in a CRDT, so it swaps the document identity — **epoch
  increment** → new room, new IndexedDB namespace, stale sockets kicked
  (`4410`), clients auto-reload. Everyone lands on the same restored state.

## 5. Verification, honestly (1.5 min)

| Layer | Evidence |
|-------|----------|
| Unit/integration | 6/6 Vitest tests: convergence, role gating, stale epoch, offline merge |
| API smoke | Phase 2/7/8 scripts: auth, comments, versions (401/403/400 paths included) |
| Multi-instance | Phase 9 smoke through nginx, clients split across both sync servers |
| Load | 25 concurrent clients converge; identical final docs |
| Static | typecheck + lint clean across all workspaces |

Mention two real bugs found and fixed during verification:
1. Early-message race — client's first sync frame arrived while the room
   was still loading → buffered and replayed.
2. Test flakiness from persisted markers — tests now use unique per-run
   markers (lessons in `docs/reflection.md`).

## 6. Limitations & next steps (1 min)

- Share links: schema + sync-side token support exist, no API/UI yet.
- Comment panel refreshes on a 10s poll instead of subscribing to the
  Redis bus event.
- No presence avatar stack ordering beyond cursor awareness; no video.
- Next: page-level offline queue flush indicator, import/export (Markdown),
  guest links with expiry, full Playwright E2E suite.

## Q&A prep

- **Why not just last-write-wins?** → lost updates on concurrent edits;
  CRDTs merge both.
- **Why two sync instances?** → horizontal scale; stateless servers with
  Redis as shared fabric; epoch-keyed rooms keep ownership clear.
- **How are permissions enforced in real time?** → at HTTP upgrade, on
  every write frame (pre-apply gate), and live via `perm:changed` bus events
  that re-check and can kick sockets.
- **What happens if Postgres goes down?** → rooms keep serving from
  memory; saves retry; browser keeps an IndexedDB copy; last-writer wins on
  reconnect (documented risk).

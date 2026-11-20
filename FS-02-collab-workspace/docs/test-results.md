# Test Results

Recorded on Windows (Node 20, Postgres + Redis + sync1 + sync2 + nginx in
Docker, web + sync dev servers locally). Re-run commands in the README
verification section.

## Integration tests (Vitest) — 6/6 passing

```
npm run test -w tests
Test Files  2 passed (2)
Tests       6 passed (6)
Duration    ~18s
```

### `tests/test/integration/sync.test.ts` (5 tests)

| Test | Result |
|------|--------|
| second client receives state written before it joined (resume/step1 flow) | pass |
| two clients editing concurrently converge to identical text | pass |
| COMMENT role can read but its updates are rejected (server-side write gate) | pass |
| VIEW role read-only — updates ignored, text identical | pass |
| stale epoch room rejected with HTTP 409 at upgrade | pass |

Notes:
- Providers are created with `disableBc: true` — in-process BroadcastChannel
  would let two clients sync without the server, silently bypassing the role
  gate (see `docs/crdt-notes.md`).
- `Unable to compute message` on stderr is benign: y-websocket's
  `readSyncMessage` has no handler for custom message type 127 (hello/ping).

### `tests/test/integration/offline.test.ts` (1 test)

| Test | Result |
|------|--------|
| edits made while disconnected merge on reconnect; peer's concurrent edits arrive | pass |

- Client disconnects (`provider.disconnect()`), keeps inserting locally while
  the peer edits concurrently, then reconnects → both docs converge to the
  exact same union text (string equality, not contains).
- The "offline edit not leaked" phase asserts the disconnected client's edits
  do **not** reach the peer before reconnect.
- Epoch is read live from `page.document.epoch` (restores bump it; a stale
  epoch would get 409).
- Markers are unique per run (`Date.now()` suffix) — the page doc persists in
  Postgres across runs, so fixed markers from a previous run would satisfy
  assertions spuriously (this caused a false failure on the second run before
  the fix).

## Smoke tests (against live dev stack) — all PASS

| Script | Covers | Result |
|--------|--------|--------|
| `node scripts/smoke-phase2.mjs` | auth + workspaces | PASS |
| `node scripts/smoke-phase7.mjs` | threads: create 200 → reply 200 → list 200 → resolve 200 → resolved hidden by default / visible with `includeResolved` → delete own comment 200 (soft-delete filtered from list) → anonymous create 401 | PASS |
| `node scripts/smoke-phase8.mjs` | manual version save → 200 → checksum dedupe → COMMENT restore 403 → concurrent edit via y-websocket → restore 200 with `epoch: 4` → pre-restore snapshot present → checksum equality → re-restore same version 400 no-op | PASS |
| `node scripts/smoke-phase9.mjs` | 4 clients across nginx → sync1 + sync2 (`client instances: sync2, sync1, sync1, sync2`), marker replicated to every client despite crossing instances | PASS |

## Cross-instance convergence (Docker stack)

```
docker compose up -d            # postgres, redis, sync1, sync2, nginx
curl http://localhost:4000/healthz   # alternates: {"instance":"sync1"| "sync2"}
node scripts/smoke-phase9.mjs        # PASS
```

nginx `least_conn` balancing verified: repeated `/healthz` calls alternate
between `sync1` and `sync2`; full smoke proves Redis fan-out relays updates
between the two room sets.

## Load test — PASS

```
node scripts/load-test.mjs
all 25 clients synced in 2035ms
writes done in 2417ms; waiting for convergence…
converged: true | doc sizes consistent: true (1017 chars)
LOAD TEST PASS: 25 clients, connect 2035ms, all markers replicated everywhere
```

- 25 concurrent Yjs clients through nginx → both sync instances.
- Every client's final document is byte-identical in size and contains all
  markers from all peers (verified set equality per client).
- Throwaway page created for the run and deleted afterwards.
- Earlier cold run on the same setup: 9621ms to sync 25 clients — variance is
  server-side room creation (first run) vs. warm in-memory rooms.

## Static checks

```
npm run typecheck   # exit 0 — all 5 workspaces
npm run lint        # "No ESLint warnings or errors"
npm run build -w apps/sync   # tsc clean
```

`next build` verified during Phase 9 (full production build succeeded after
fixing missing OpenSSL in the Docker runtime image). Not re-run in the final
pass because it clobbers the running dev server's `.next` cache.

## Known-unstable / environment-dependent

- **Web dev server cold compile**: first request after restart takes ~20s
  (on-demand compilation); subsequent requests fast. Health probes need a
  generous timeout.
- **`npm run lint` at repo root** can hang under ESLint cache lock contention;
  re-running or running `npm run lint -w apps/web` directly succeeds.
- **Docker web image is built but not started** by default — port 3000 is
  held by the local dev server (`docker compose up -d web` needs it stopped).

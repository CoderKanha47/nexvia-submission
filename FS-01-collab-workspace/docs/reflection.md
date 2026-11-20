# Engineering Reflection

## What went well

**Building from primitives paid off.** Implementing the Yjs sync protocol
by hand (instead of dropping in `y-websocket`'s server verbatim) is what made
role enforcement *possible*: CRDT updates can't be permission-checked after
they're merged, so the write gate had to sit in front of `Y.applyUpdate`.
Every permission test that passes (COMMENT/VIEW writes dropped server-side)
exists because of that one early decision.

**End-to-end verification after every phase.** Each feature was committed
only after a script exercised it against the real stack — API route, sync
server, Postgres, Redis. This caught integration bugs (see below) that no
amount of type-checking would have.

**Epochs solved an apparently unsolvable problem cleanly.** "Restore an old
version" is contradictory in a CRDT (history only grows). Replacing the
document *identity* — room name + IndexedDB namespace keyed by epoch — turns
restore into a fresh-start problem Yjs already handles perfectly, and gives a
bonus: stale offline edits from before the restore can't leak in.

## Hard problems and how they were solved

### 1. Binary data cannot travel through ioredis pub/sub
Yjs updates are arbitrary bytes; Redis pub/sub via ioredis delivers UTF-8
strings. Silent corruption (replacement characters) caused phantom parse
errors. Fix: base64 on the wire for room payloads, plain JSON for the
control bus. The `Unable to compute message` stderr seen in test logs is the
separate, benign case of y-websocket not handling our custom message type
127.

### 2. The message arrived before the listener
On cold rooms, `attach()` awaited a Postgres load before registering
`ws.on('message')` — but browsers send sync step1 *immediately* on open.
Dropped first frame → the sync handshake never completed → client stuck on
"syncing". Fix: register first, buffer, replay. Classic async-race class
bug: never make registration of an event consumer depend on an awaited
resource without a queue in between.

### 3. Reading a decoder twice shifts it
Gating writes required reading the Yjs sync sub-type before the built-in
handler — but the built-in `readSyncMessage` reads it again, misaligning the
decoder (`Unexpected end of array`). Resolution: fully parse message type 0
manually and never mix manual reads with library reads. Lesson: if you need
to peek at a stream the library owns, own that code path entirely.

### 4. In-process test clients bypassed the server entirely
Two `WebsocketProvider`s in one Node process discover each other via
lib0 `BroadcastChannel` and sync directly — so the role gate was never
consulted and tests gave misleading passes. Fix: `disableBc: true` in test
helpers. Worth remembering: "distributed" tests running in one process are
not distributed unless you deliberately sever the local channels.

### 5. Tests that poison their own reruns
The offline test's assertions used fixed marker strings on a document that
persists in Postgres. The first run passed and *wrote its markers into the
doc*; the second run synced text that already contained the marker and hung
on a "does not contain" assertion. Diagnosed by noticing the failure only
appeared on repeat runs. Fix: unique per-run markers (`Date.now()` suffix).
General rule: integration tests against durable state must be idempotent —
either unique fixtures per run or full cleanup.

### 6. Docker "works on my machine" ≠ works in the image
`node:20-bookworm-slim` ships without OpenSSL; `prisma generate` needs it at
build time (target `debian-openssl-3.0.x`) and `@prisma/client` needs it at
runtime. Build and runtime stages both required an explicit
`apt-get install openssl` — a failure that only appears when the image is
rebuilt from scratch, not when a volume-mounted dev server is running.

## Decisions I'd defend

- **Polling over socket events for the comments panel** — comments are
  low-frequency; a 10s poll + focus refresh avoids another realtime channel
  to get wrong. (Tradeoff accepted and documented; a `comment:changed` bus
  event already exists for the upgrade.)
- **Role checks in three places** (HTTP API, WS upgrade, WS write gate) —
  slightly redundant, but each layer defends a different attack: forged
  requests, hijacked tokens, and privilege changes mid-session.
- **`flush`/`flush-ack` bus round-trip before snapshots** — the debounced
  1.2s saver means a snapshot taken instantly after an edit would be
  stale; asking the owning sync instance to flush first is cheaper than
  shrinking the debounce for everyone.
- **Sharding by `(pageId, epoch)`** — makes rooms disposable: restore,
  crash recovery, and manual resets all reduce to "drop the room".

## What I would do differently

1. **Comment/event bus first, polling never** — I added the `comment:changed`
   bus event after the poll was already working; wiring the panel to it
   upfront would have been less total work.
2. **Test fixtures should own their data** — the marker-poisoning bug was
   predictable. Creating a dedicated page per test run (and deleting it) is
   strictly better than appending to a seed page shared with other runs.
3. **Share links: schema-first didn't mean UI-last** — token support exists
   end-to-end in sync + helpers, but without an API route it's invisible to
   users; a thin route would have made the feature demonstrable.
4. **Health/readiness probes earlier** — `/healthz` per instance (instance
   id + room count) made load-balancing verification trivial; it should have
   appeared in Phase 4, not Phase 9.

## Time/effort pattern

Most wall-clock time went to integration verification rather than writing
features — running smoke scripts, restarting dev servers after `next build`
clobbered `.next`, and bisecting the one test failure that only reproduced
on reruns. That ratio felt right for a system where the failure modes are
concurrency bugs: the code is small, the interactions are where the risk
lives.

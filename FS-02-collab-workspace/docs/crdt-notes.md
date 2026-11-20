# CRDT Notes — Yjs in Nexvia

## Why CRDTs

Yjs documents converge without a central lock: every edit is an immutable,
causally-ordered operation. Two peers editing the same paragraph offline and
reconnecting reach the same state deterministically — no OT server, no
last-write-wins data loss.

## Document model

Each page owns one `Y.Doc`. TipTap's `Collaboration` extension binds the
editor to the doc's `XmlFragment('default')`, so the serialized editor state
*is* the CRDT — there is no separate "save document" step. Title, favorites
and tree metadata intentionally live outside the CRDT in Postgres (they are
CRUD-shaped, not collaboratively edited).

## The wire protocol (implemented from scratch in `apps/sync`)

Frames are lib0-encoded:

| Msg | Value | Meaning |
|-----|-------|---------|
| `messageSync` | 0 | Container for sync sub-messages below |
| ├ `messageYjsSyncStep1` | 0 | "here's my state vector — send what I lack" |
| ├ `messageYjsSyncStep2` | 1 | Differential state (also used for updates) |
| └ `messageYjsUpdate` | 2 | Incremental update |
| `messageAwareness` | 1 | Cursors/presence (ephemeral, not persisted) |
| custom | 127 | JSON: hello instance id, ping, doc:reset, perm:role |

Connection handshake:

1. Client opens `/{room}?token=JWT` — server verifies JWT, membership role
   and **epoch match** before accepting (401/403/409 at upgrade time).
2. Server immediately sends step1 (its state vector) + awareness state.
3. Client sends step1 on open. Both sides answer with step2 — the union of
   both directions converges the docs in one round trip.

### Sub-type pre-read (subtle bug #1)

`syncProtocol.readSyncMessage` reads the sub-type itself. Our server needs to
gate *writes* by role before applying, so it reads the sub-type manually —
but naively calling `readSyncMessage` afterwards made it **read the sub-type
a second time**, shifting the decoder and throwing
`Unexpected end of array` / `Caught error while handling a Yjs update`.
Fix: fully parse message 0's body manually (room.ts `handleMessageInner`),
never mix manual reads with `readSyncMessage`.

### Binary through Redis (subtle bug #2)

`ioredis` pub/sub delivers messages as UTF-8 strings. CRDT payloads are
arbitrary bytes — round-tripping them as strings injects replacement
characters (`\uFFFD`) and the update fails checksum/parse. All room payloads
are therefore **base64-encoded** in `publishRoom` and decoded on receipt.
Control messages (bus JSON) are safe as plain text.

### In-process BroadcastChannel bypass (subtle bug #3)

Two `WebsocketProvider`s in the same JS process discover each other through
lib0's `BroadcastChannel` and sync **without touching the server** — silently
bypassing permission enforcement. Integration tests must construct providers
with `disableBc: true`. (In production, separate tabs genuinely should share
edits; the server still receives them from whichever tab holds the socket.)

### Early-message race (subtle bug #4)

The client sends step1 immediately on socket open, but the server used to
register its message listener only *after* `await getOrCreateRoom()` (a
Postgres read on cold rooms). Messages arriving in that window were dropped —
the client never received step2 and hung in "syncing". `attach()` now
registers the listener first and buffers messages until the room is ready.

## Epochs: replacing a whole document

CRDTs can't be "rolled back" — history only grows. To restore a version we
**replace the document identity**:

1. Save current state as a `RESTORE` snapshot (undo-ability).
2. Write the target snapshot bytes into `pageDocument.state`, `epoch += 1`.
3. Publish `doc:reset` → every sync instance closes its room's sockets with
   code `4410` after a final custom message.
4. Clients refetch the page, see the new epoch, and rebuild: new room name →
   new IndexedDB namespace → no stale offline edits merge into the restored
   doc.

Persistence is guarded `UPDATE … WHERE pageId AND epoch`, so a room that was
kicked mid-save can never write its (now stale) in-memory state back.

## Awareness vs document

Awareness (cursors, avatars, follow targets) is ephemeral: held in memory,
rebroadcast on join, removed on disconnect, never persisted. Follow mode
reads the target's `cursor.anchor/head` positions from awareness and scrolls
the viewport on every awareness change.

## Offline

`y-indexeddb` persists the doc locally under the room name. While offline,
edits accumulate in the local doc (the provider simply has no socket). On
reconnect the normal step1/step2 exchange diffs local vs. server state —
both directions merge. `tests/test/integration/offline.test.ts` proves the
merge half deterministically; the IndexedDB half runs in the browser
(degraded gracefully when the API is unreachable: status shows
"Offline — changes saved locally").

## Persistence strategy

- **Write path**: every applied update → Redis fan-out (other instances) +
  `scheduleSave()` (debounced 1.2s → `UPDATE pageDocument`).
- **Snapshots**: auto every 250 updates / 10 min (SHA-256 deduped, keep 50),
  manual on demand (keep 100), pre-restore always.
- **Flush**: `flush` bus event forces pending saves and acks with `flush-ack`
  — used by manual version save/restore so snapshots never miss the last
  keystrokes.

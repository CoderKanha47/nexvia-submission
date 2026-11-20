# REST API

All routes live under `/api` in `apps/web`. Requests authenticate via the
NextAuth session cookie; handlers wrap logic with `handle()` from
`lib/api-helpers.ts`, which converts `ApiError(status, message)` into
`{ error: string }` JSON responses. Bodies are validated with Zod via
`parseBody()`. Role gates use `requireWorkspaceRole(id, minRole)` or
`requirePageRole(pageId, minRole)`.

Role ordering: `OWNER > EDIT > COMMENT > VIEW`.

## Auth

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account (name, email, password) |
| * | `/api/auth/[...nextauth]` | — | NextAuth login/session (credentials provider, JWT) |
| POST | `/api/auth/ws-token` | session | Short-lived HS256 JWT for the WebSocket sync server (`typ:user`, 10 min) |

## Workspaces

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces` | session | Workspaces the user belongs to (with role + pageCount) |
| POST | `/api/workspaces` | session | Create workspace (user becomes OWNER) |
| GET | `/api/workspaces/[id]` | VIEW | Workspace detail |
| PATCH | `/api/workspaces/[id]` | OWNER | Rename |
| DELETE | `/api/workspaces/[id]` | OWNER | Delete workspace |
| GET | `/api/workspaces/[id]/tree` | VIEW | Flat page list (non-deleted) + favorites, ordered for the sidebar |
| POST | `/api/workspaces/[id]/pages` | EDIT | Create page (optional `title`, `icon`, `parentId`) — initializes Yjs doc state |
| GET | `/api/workspaces/[id]/members` | VIEW | Members (used by the @mention picker) |
| POST | `/api/workspaces/[id]/members` | OWNER | Invite by email — existing users added directly, others get an invite link |
| PATCH | `/api/workspaces/[id]/members/[userId]` | OWNER | Change member role |
| DELETE | `/api/workspaces/[id]/members/[userId]` | OWNER | Remove member (owner cannot remove themselves) |
| GET | `/api/workspaces/[id]/invites` | OWNER | List pending invites |
| POST | `/api/workspaces/[id]/invites` | OWNER | Create invite link |
| DELETE | `/api/workspaces/[id]/invites` | OWNER | Revoke invite |
| POST | `/api/workspaces/[id]/reorder` | EDIT | Persist sidebar drag-and-drop ordering |
| GET | `/api/workspaces/[id]/trash` | VIEW | Deleted pages |

## Pages

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/pages/[id]` | VIEW | Page detail incl. `epoch`, `stateVersion`, caller `role` |
| PATCH | `/api/pages/[id]` | EDIT | Rename / move (`parentId`) / reorder; rejects self-parenting |
| DELETE | `/api/pages/[id]` | EDIT | Soft-delete to trash (cascades to subtree via UI flow) |
| POST | `/api/pages/[id]/favorite` | VIEW | Toggle favorite |
| POST | `/api/pages/[id]/duplicate` | EDIT | Deep-copy page subtree with fresh docs |
| POST | `/api/pages/[id]/restore` | EDIT | Restore from trash |
| DELETE | `/api/pages/[id]/restore` | EDIT | Permanently delete |
| GET | `/api/invites/[token]` | — | Preview invite (workspace name, inviter, role) |
| POST | `/api/invites/[token]` | session | Accept invite |

## Versions

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/pages/[id]/versions` | VIEW | List 100 newest versions (metadata only, no snapshot bytes) |
| POST | `/api/pages/[id]/versions` | EDIT | Manual snapshot — flushes sync servers first, SHA-256 dedupe against latest, prunes beyond 100 MANUAL |
| POST | `/api/versions/[id]/restore` | EDIT | Restore snapshot: saves current state as `RESTORE` version, swaps state, increments epoch, publishes `doc:reset`. `400` if content already current |

## Comments

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/pages/[id]/threads` | VIEW | Threads + comments (+ `includeResolved=true`) |
| POST | `/api/pages/[id]/threads` | COMMENT | New thread with optional `quote` anchor and `mentions[]` |
| POST | `/api/threads/[id]` | COMMENT | Reply to thread |
| PATCH | `/api/threads/[id]` | COMMENT | `{ resolved: boolean }` — resolve/reopen |
| DELETE | `/api/comments/[id]` | author / OWNER | Soft-delete (body + mentions cleared, hidden from listings) |

## WebSocket sync server (not REST)

- URL: `ws://host:1234/dev` (or `ws://localhost:4000` through nginx),
  room path = `page:{pageId}:e{epoch}`, auth via `?token=<ws JWT>`.
- Binary frames: Yjs `0=sync`, `1=awareness`, `127=custom` (JSON hello/ping,
  `doc:reset`, `perm:role`).
- Close codes: `401/4401/4403` auth, `409` stale epoch, `4410` doc reset,
  `4429` rate limit (5 MB/s, 16 MB max message).
- `GET /healthz` → `{ ok, instance, rooms }`.

## Error shape

```json
{ "error": "Human-readable message" }
```

Status codes: `400` validation/state conflicts · `401` unauthenticated ·
`403` role insufficient · `404` not found · `409` conflict (epoch, duplicate
member) · `429` rate limited.

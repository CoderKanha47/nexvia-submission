import { createHash } from 'node:crypto';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type WebSocket from 'ws';
import { prisma } from '@nexvia/db';
import {
  AUTO_SNAPSHOT_EVERY_MS,
  AUTO_SNAPSHOT_EVERY_UPDATES,
  AUTO_SNAPSHOT_KEEP,
  PERSIST_DEBOUNCE_MS,
  ROOM_GC_IDLE_MS,
  WS_MESSAGE_CUSTOM,
  canEdit,
  createLogger,
  type Role,
  type WsCustomServerMessage,
} from '@nexvia/shared';
import { INSTANCE_ID, publishRoom } from './redis';

const log = createLogger('sync:room');

export const messageSync = 0;
export const messageAwareness = 1;
export const messageCustom = WS_MESSAGE_CUSTOM;

export interface ConnAuth {
  userId: string;
  name: string | null;
  role: Role;
  /** Share-link id when authenticated via share token. */
  shareId?: string;
}

export class Conn {
  readonly id = Math.random().toString(36).slice(2);
  role: Role;
  closed = false;
  /** Awareness client IDs controlled by this connection (for cleanup on close). */
  readonly controlledIds = new Set<number>();
  /** Bytes received in the current rate-limit window. */
  bytesInWindow = 0;
  windowStart = Date.now();

  constructor(
    readonly ws: WebSocket,
    readonly auth: ConnAuth,
  ) {
    this.role = auth.role;
  }

  get canEdit(): boolean {
    return canEdit(this.role);
  }

  send(data: Uint8Array): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    try {
      this.ws.send(data);
    } catch (err) {
      log.warn('send failed', { err: String(err) });
    }
  }

  sendCustom(msg: WsCustomServerMessage): void {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageCustom);
    encoding.writeVarString(enc, JSON.stringify(msg));
    this.send(encoding.toUint8Array(enc));
  }

  close(code: number, reason: string): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.ws.close(code, reason);
    } catch {
      /* noop */
    }
  }
}

export class Room {
  readonly doc = new Y.Doc();
  readonly awareness: awarenessProtocol.Awareness;
  readonly conns = new Set<Conn>();

  loaded = false;
  loading: Promise<void> | null = null;
  dirty = false;
  saveTimer: NodeJS.Timeout | null = null;
  gcTimer: NodeJS.Timeout | null = null;
  destroyed = false;

  updatesSinceSnapshot = 0;
  lastSnapshotAt = Date.now();
  lastSnapshotChecksum: string | null = null;
  snapshotTimer: NodeJS.Timeout | null = null;

  constructor(readonly name: string, readonly pageId: string, readonly epoch: number) {
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.awareness.setLocalState(null);

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.dirty = true;
      this.updatesSinceSnapshot += 1;
      this.scheduleSave();

      // Broadcast to local connections except the origin connection.
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageSync);
      encoding.writeVarUint(enc, 2); // messageYjsUpdate
      encoding.writeVarUint8Array(enc, update);
      const payload = encoding.toUint8Array(enc);
      for (const conn of this.conns) {
        if (conn === origin) continue;
        conn.send(payload);
      }
      // Relay to other instances unless this update came from Redis.
      if (origin !== 'redis') {
        void publishRoom(this.name, wrapBinary('sync', update));
      }
      this.maybeSnapshot();
    });

    this.awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin instanceof Conn) {
          for (const id of [...added, ...updated]) origin.controlledIds.add(id);
          for (const id of removed) origin.controlledIds.delete(id);
        }
        const changed = [...added, ...updated, ...removed];
        if (changed.length === 0) return;
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageAwareness);
        encoding.writeVarUint8Array(enc, update);
        const payload = encoding.toUint8Array(enc);
        for (const conn of this.conns) {
          if (conn === origin) continue;
          conn.send(payload);
        }
        if (origin !== 'redis') {
          void publishRoom(this.name, wrapBinary('awareness', update));
        }
      },
    );
  }

  async load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const doc = await prisma.pageDocument.findUnique({ where: { pageId: this.pageId } });
      if (doc && doc.state.length > 0) {
        try {
          Y.applyUpdate(this.doc, new Uint8Array(doc.state), 'load');
        } catch (err) {
          log.error('failed to apply persisted state', { pageId: this.pageId, err: String(err) });
        }
      } else if (!doc) {
        await prisma.pageDocument.create({
          data: { pageId: this.pageId, state: Buffer.from(Y.encodeStateAsUpdate(this.doc)) },
        });
      }
      this.loaded = true;
    })();
    return this.loading;
  }

  scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.save();
    }, PERSIST_DEBOUNCE_MS);
  }

  async save(): Promise<boolean> {
    if (this.destroyed) return false;
    const state = Buffer.from(Y.encodeStateAsUpdate(this.doc));
    try {
      const res = await prisma.pageDocument.updateMany({
        // Guard against restoring epochs overwriting stale in-memory state.
        where: { pageId: this.pageId, epoch: this.epoch },
        data: { state, stateVersion: { increment: 1 } },
      });
      if (res.count === 0) {
        log.warn('save skipped: epoch mismatch', { pageId: this.pageId, epoch: this.epoch });
        return false;
      }
      this.dirty = false;
      return true;
    } catch (err) {
      log.error('save failed', { pageId: this.pageId, err: String(err) });
      return false;
    }
  }

  maybeSnapshot(force = false): void {
    if (!force && this.destroyed) return;
    const dueByCount = this.updatesSinceSnapshot >= AUTO_SNAPSHOT_EVERY_UPDATES;
    const dueByTime = Date.now() - this.lastSnapshotAt >= AUTO_SNAPSHOT_EVERY_MS;
    if (!force && !dueByCount && !dueByTime) return;

    void (async () => {
      try {
        const state = Buffer.from(Y.encodeStateAsUpdate(this.doc));
        const checksum = createHash('sha256').update(state).digest('hex');
        if (checksum === this.lastSnapshotChecksum) {
          this.updatesSinceSnapshot = 0;
          this.lastSnapshotAt = Date.now();
          return;
        }
        await prisma.$transaction([
          prisma.version.create({
            data: {
              pageId: this.pageId,
              label: null,
              snapshot: state,
              type: 'AUTO',
              byteSize: state.length,
              checksum,
            },
          }),
          // Keep auto-snapshots bounded.
          prisma.version.deleteMany({
            where: {
              pageId: this.pageId,
              type: 'AUTO',
              id: {
                notIn: (
                  await prisma.version.findMany({
                    where: { pageId: this.pageId, type: 'AUTO' },
                    orderBy: { createdAt: 'desc' },
                    take: AUTO_SNAPSHOT_KEEP,
                    select: { id: true },
                  })
                ).map((v: { id: string }) => v.id),
              },
            },
          }),
        ]);
        this.lastSnapshotChecksum = checksum;
        this.updatesSinceSnapshot = 0;
        this.lastSnapshotAt = Date.now();
      } catch (err) {
        log.error('auto snapshot failed', { pageId: this.pageId, err: String(err) });
      }
    })();
  }

  addConn(conn: Conn): void {
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    this.conns.add(conn);
    conn.sendCustom({ type: 'hello', instanceId: INSTANCE_ID });

    // Kick off sync: step1 (our state vector) so the client sends missing structs.
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageSync);
    encoding.writeVarUint(enc, 0); // messageYjsSyncStep1
    encoding.writeVarUint8Array(enc, Y.encodeStateVector(this.doc));
    conn.send(encoding.toUint8Array(enc));

    // Awareness: send everything we know.
    const states = this.awareness.getStates();
    if (states.size > 0) {
      const awEnc = encoding.createEncoder();
      encoding.writeVarUint(awEnc, messageAwareness);
      encoding.writeVarUint8Array(
        awEnc,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...states.keys()]),
      );
      conn.send(encoding.toUint8Array(awEnc));
    }
  }

  removeConn(conn: Conn): void {
    if (!this.conns.delete(conn)) return;
    const controlledIds = [...conn.controlledIds];
    if (controlledIds.length > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, controlledIds, 'conn-close');
    }
    if (this.conns.size === 0) {
      this.gcTimer = setTimeout(() => void this.destroy(), ROOM_GC_IDLE_MS);
      this.gcTimer.unref?.();
    }
  }

  /** Handle a raw sync/awareness/custom payload from a connection. */
  handleMessage(conn: Conn, data: Uint8Array): void {
    try {
      this.handleMessageInner(conn, data);
    } catch (err) {
      log.warn('message handling failed', { err: String(err) });
    }
  }

  private handleMessageInner(conn: Conn, data: Uint8Array): void {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === messageSync) {
      // Read the inner sync sub-type ourselves so we can gate writes for
      // read-only roles BEFORE applying anything to the document.
      const syncType = decoding.readVarUint(decoder);
      const isWrite = syncType === 1 || syncType === 2; // step2 / update
      if (isWrite && !conn.canEdit) {
        // Read-only users may sync but not write. Ignore silently —
        // the client UI already hides editing affordances.
        return;
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      switch (syncType) {
        case 0: {
          // SyncStep1: reply with everything we have they don't.
          encoding.writeVarUint(encoder, 1); // messageYjsSyncStep2
          encoding.writeVarUint8Array(
            encoder,
            Y.encodeStateAsUpdate(this.doc, decoding.readVarUint8Array(decoder)),
          );
          break;
        }
        case 1: // messageYjsSyncStep2
        case 2: {
          // messageYjsUpdate
          const update = decoding.readVarUint8Array(decoder);
          try {
            Y.applyUpdate(this.doc, update, conn);
          } catch (err) {
            log.warn('bad yjs update', { err: String(err) });
          }
          break;
        }
        default:
          return; // unknown sub-type — ignore
      }
      if (encoding.length(encoder) > 1) {
        conn.send(encoding.toUint8Array(encoder));
      }
      return;
    }

    if (messageType === messageAwareness) {
      const update = decoding.readVarUint8Array(decoder);
      try {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, update, conn);
      } catch (err) {
        log.warn('bad awareness update', { err: String(err) });
      }
      return;
    }

    if (messageType === messageCustom) {
      const raw = decoding.readVarString(decoder);
      try {
        const msg = JSON.parse(raw) as { type?: string };
        if (msg.type === 'ping') {
          conn.sendCustom({ type: 'hello', instanceId: INSTANCE_ID });
        }
      } catch {
        /* ignore malformed custom messages */
      }
    }
  }

  /** Apply an update that originated on another instance (via Redis). */
  applyRemoteSync(update: Uint8Array): void {
    try {
      Y.applyUpdate(this.doc, update, 'redis');
    } catch (err) {
      log.error('redis sync apply failed', { room: this.name, err: String(err) });
    }
  }

  applyRemoteAwareness(update: Uint8Array): void {
    try {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, update, 'redis');
    } catch (err) {
      log.warn('redis awareness apply failed', { err: String(err) });
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    if (this.conns.size > 0) return;
    this.destroyed = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    await this.save();
    this.awareness.destroy();
    this.doc.destroy();
  }
}

/** Wire format for Redis room messages: 1-byte kind + payload. */
export function wrapBinary(kind: 'sync' | 'awareness', payload: Uint8Array): Buffer {
  const out = Buffer.allocUnsafe(payload.length + 1);
  out[0] = kind === 'sync' ? 1 : 2;
  Buffer.from(payload.buffer, payload.byteOffset, payload.length).copy(out, 1);
  return out;
}

export function unwrapBinary(message: Buffer): { kind: 'sync' | 'awareness'; payload: Uint8Array } | null {
  if (message.length < 1) return null;
  const kind = message[0];
  const payload = new Uint8Array(message.buffer, message.byteOffset + 1, message.length - 1);
  if (kind === 1) return { kind: 'sync', payload };
  if (kind === 2) return { kind: 'awareness', payload };
  return null;
}

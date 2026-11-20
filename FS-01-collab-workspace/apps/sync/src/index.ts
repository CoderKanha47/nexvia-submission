import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  INSTANCE_ID,
  getSubscriber,
  publishBus,
  subscribeRooms,
} from './redis';
import { config } from './config';
import { verifyToken } from './auth';
import { Conn, Room, unwrapBinary } from './room';
import { getPageAccessCached, invalidateAccess } from './permissions';
import { canView, createLogger, parseRoomName, type BusEvent } from '@nexvia/shared';
import { prisma } from '@nexvia/db';

const log = createLogger('sync');

const MAX_BYTES_PER_SECOND = 5 * 1024 * 1024;
const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;
const PING_INTERVAL_MS = 30_000;

/** room name -> Room */
const rooms = new Map<string, Room>();
/** pageId -> room names */
const roomsByPage = new Map<string, Set<string>>();

function registerRoom(room: Room): void {
  rooms.set(room.name, room);
  let set = roomsByPage.get(room.pageId);
  if (!set) {
    set = new Set();
    roomsByPage.set(room.pageId, set);
  }
  set.add(room.name);
}

function unregisterRoom(room: Room): void {
  rooms.delete(room.name);
  const set = roomsByPage.get(room.pageId);
  if (set) {
    set.delete(room.name);
    if (set.size === 0) roomsByPage.delete(room.pageId);
  }
}

async function getOrCreateRoom(pageId: string, epoch: number): Promise<Room> {
  const name = `page:${pageId}:e${epoch}`;
  let room = rooms.get(name);
  if (room && !room.destroyed) return room;
  room = new Room(name, pageId, epoch);
  registerRoom(room);
  await room.load();
  return room;
}

async function handleUpgrade(req: unknown, socket: import('node:stream').Duplex, head: Buffer): Promise<void> {
  const url = new URL((req as { url?: string }).url ?? '/', 'http://localhost');
  const roomName = url.pathname.replace(/^\//, '');
  const parsed = parseRoomName(roomName);
  if (!parsed) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const token = url.searchParams.get('token');
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const claims = await verifyToken(token);
  if (!claims) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  let role: string | null = null;
  let accessPageId = parsed.pageId;
  if (claims.typ === 'user') {
    const access = await getPageAccessCached(claims.sub, parsed.pageId);
    if (!access || !canView(access.role)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    role = access.role;
    if (access.epoch !== parsed.epoch) {
      // Client is on a stale document epoch (e.g. after version restore).
      socket.write('HTTP/1.1 409 Stale Epoch\r\n\r\n');
      socket.destroy();
      return;
    }
  } else {
    if (claims.pageId !== parsed.pageId) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    role = claims.role;
    const doc = await prisma.pageDocument.findUnique({
      where: { pageId: claims.pageId },
      select: { epoch: true },
    });
    if ((doc?.epoch ?? 1) !== parsed.epoch) {
      socket.write('HTTP/1.1 409 Stale Epoch\r\n\r\n');
      socket.destroy();
      return;
    }
    accessPageId = claims.pageId;
  }

  wss.handleUpgrade(req as never, socket, head, (ws) => {
    void attach(ws, {
      pageId: accessPageId,
      epoch: parsed.epoch,
      userId: claims.sub,
      name: claims.typ === 'user' ? (claims.name ?? null) : null,
      role: role!,
      shareId: claims.typ === 'share' ? claims.sid : undefined,
    });
  });
}

interface AttachOpts {
  pageId: string;
  epoch: number;
  userId: string;
  name: string | null;
  role: string;
  shareId?: string;
}

async function attach(ws: WebSocket, opts: AttachOpts): Promise<void> {
  // Buffer messages that arrive while the room is still loading — the client
  // sends its sync step1 immediately on open, before getOrCreateRoom resolves.
  const pending: { data: Buffer; isBinary: boolean }[] = [];
  let ready = false;
  let roomRef: Room | null = null;
  let connRef: Conn | null = null;

  const dispatch = (data: Buffer, isBinary: boolean): void => {
    const room = roomRef;
    const conn = connRef;
    if (!room || !conn) return;
    if (!isBinary) return;
    const now = Date.now();
    if (now - conn.windowStart > 1000) {
      conn.windowStart = now;
      conn.bytesInWindow = 0;
    }
    conn.bytesInWindow += data.length;
    if (conn.bytesInWindow > MAX_BYTES_PER_SECOND) {
      log.warn('rate limit exceeded', { userId: conn.auth.userId });
      conn.close(4429, 'Rate limit exceeded');
      return;
    }
    if (data.length > MAX_MESSAGE_BYTES) {
      conn.close(4429, 'Message too large');
      return;
    }
    room.handleMessage(conn, new Uint8Array(data.buffer, data.byteOffset, data.length));
  };

  ws.on('message', (data: Buffer, isBinary: boolean) => {
    if (!ready) {
      pending.push({ data, isBinary });
      return;
    }
    dispatch(data, isBinary);
  });

  ws.on('close', () => {
    if (connRef) connRef.closed = true;
    roomRef?.removeConn(connRef!);
  });
  ws.on('error', (err: Error) => {
    log.warn('ws error', { err: err.message });
    if (connRef) connRef.closed = true;
    roomRef?.removeConn(connRef!);
  });

  try {
    const room = await getOrCreateRoom(opts.pageId, opts.epoch);
    const conn = new Conn(ws, {
      userId: opts.userId,
      name: opts.name,
      role: opts.role as never,
      shareId: opts.shareId,
    });
    roomRef = room;
    connRef = conn;
    ready = true;

    room.addConn(conn);
    log.info('client connected', {
      room: room.name,
      userId: conn.auth.userId,
      role: conn.role,
      conns: room.conns.size,
      instance: INSTANCE_ID,
    });

    for (const m of pending) dispatch(m.data, m.isBinary);
    pending.length = 0;
  } catch (err) {
    log.error('attach failed', { err: String(err) });
    try {
      ws.close(1011, 'Internal error');
    } catch {
      /* noop */
    }
  }
}

const server = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, instance: INSTANCE_ID, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  void handleUpgrade(req, socket, head);
});

async function handleBusEvent(event: BusEvent): Promise<void> {
  switch (event.type) {
    case 'flush': {
      const names = roomsByPage.get(event.pageId);
      if (!names || names.size === 0) return;
      for (const name of names) {
        const room = rooms.get(name);
        if (room) await room.save();
      }
      await publishBus({
        type: 'flush-ack',
        pageId: event.pageId,
        instanceId: INSTANCE_ID,
        replyTo: event.replyTo,
      });
      return;
    }
    case 'doc:reset': {
      const names = [...(roomsByPage.get(event.pageId) ?? [])];
      for (const name of names) {
        const room = rooms.get(name);
        if (!room) continue;
        for (const conn of room.conns) {
          conn.sendCustom({ type: 'doc:reset', pageId: event.pageId, epoch: event.epoch, reason: event.reason });
          conn.close(4410, 'Document reset');
        }
        room.conns.clear();
        room.destroyed = true;
        unregisterRoom(room);
        room.doc.destroy();
        room.awareness.destroy();
      }
      log.info('doc reset', { pageId: event.pageId, epoch: event.epoch });
      return;
    }
    case 'perm:changed': {
      invalidateAccess(event.pageId, event.userId);
      const names = roomsByPage.get(event.pageId);
      if (!names) return;
      for (const name of names) {
        const room = rooms.get(name);
        if (!room) continue;
        for (const conn of [...room.conns]) {
          if (conn.auth.userId !== event.userId) continue;
          if (conn.auth.shareId) continue; // share links revalidated separately
          const access = await getPageAccessCached(event.userId, event.pageId);
          if (!access || !canView(access.role)) {
            conn.sendCustom({ type: 'perm:role', pageId: event.pageId, role: null });
            conn.close(4403, 'Access revoked');
            room.removeConn(conn);
          } else {
            conn.role = access.role;
            conn.sendCustom({ type: 'perm:role', pageId: event.pageId, role: access.role });
          }
        }
      }
      return;
    }
    default:
      return;
  }
}

async function main(): Promise<void> {
  // Warm permissions module (validates DB connectivity early).
  await prisma.$queryRaw`SELECT 1`.catch((err: unknown) => {
    log.error('database not reachable', { err: String(err) });
    process.exit(1);
  });

  await subscribeRooms((roomName, message) => {
    const room = rooms.get(roomName);
    if (!room || room.destroyed) return;
    const unwrapped = unwrapBinary(message);
    if (!unwrapped) return;
    if (unwrapped.kind === 'sync') {
      room.applyRemoteSync(unwrapped.payload);
    } else {
      room.applyRemoteAwareness(unwrapped.payload);
    }
  }, handleBusEvent);

  server.listen(config.SYNC_PORT, () => {
    log.info('sync server listening', { port: config.SYNC_PORT, instance: INSTANCE_ID });
  });

  setInterval(() => {
    for (const room of rooms.values()) {
      for (const conn of room.conns) {
        if (conn.closed) continue;
        try {
          conn.ws.ping();
        } catch {
          /* noop */
        }
      }
    }
  }, PING_INTERVAL_MS).unref?.();

  const shutdown = async (): Promise<void> => {
    log.info('shutting down');
    for (const room of rooms.values()) {
      await room.save();
      unregisterRoom(room);
    }
    try {
      getSubscriber().disconnect();
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main().catch((err) => {
  log.error('fatal', { err: String(err) });
  process.exit(1);
});

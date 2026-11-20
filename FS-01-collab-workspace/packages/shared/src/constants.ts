export const APP_NAME = 'Nexvia';

/** Debounce used by the sync server when persisting Yjs state to Postgres. */
export const PERSIST_DEBOUNCE_MS = 1200;

/** Snapshot a document automatically after this many updates… */
export const AUTO_SNAPSHOT_EVERY_UPDATES = 250;

/** …or this much time, whichever comes first. */
export const AUTO_SNAPSHOT_EVERY_MS = 10 * 60 * 1000;

/** Max number of automatic snapshots kept per page. */
export const AUTO_SNAPSHOT_KEEP = 50;

/** Permission cache TTL on the sync server (ms). */
export const PERMISSION_CACHE_TTL_MS = 10_000;

/** Room GC: close in-memory room after this long with zero connections. */
export const ROOM_GC_IDLE_MS = 30_000;

export const WS_MESSAGE_CUSTOM = 127;

export function roomNameForPage(pageId: string, epoch: number): string {
  return `page:${pageId}:e${epoch}`;
}

export function parseRoomName(room: string): { pageId: string; epoch: number } | null {
  const m = /^page:(.+):e(\d+)$/.exec(room);
  if (!m) return null;
  return { pageId: m[1]!, epoch: Number(m[2]) };
}

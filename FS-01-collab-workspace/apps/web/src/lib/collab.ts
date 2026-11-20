'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WS_MESSAGE_CUSTOM } from '@nexvia/shared';

export type CollabStatus = 'connecting' | 'connected' | 'syncing' | 'offline';

export interface CollabHandle {
  doc: Y.Doc;
  provider: WebsocketProvider;
  indexeddb: IndexeddbPersistence;
  destroy: () => void;
}

export function roomNameFor(pageId: string, epoch: number): string {
  return `page:${pageId}:e${epoch}`;
}

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/ws-token', { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

/**
 * Creates the Yjs doc, the websocket provider (y-websocket protocol) and the
 * IndexedDB persistence layer for offline editing.
 */
export function createCollab(opts: {
  pageId: string;
  epoch: number;
  token: string;
  onStatus?: (status: CollabStatus) => void;
  onSync?: (synced: boolean) => void;
  /** Fired when the server resets the doc (e.g. version restore) — reload the page. */
  onDocReset?: () => void;
}): CollabHandle {
  const doc = new Y.Doc();
  const docName = roomNameFor(opts.pageId, opts.epoch);
  const wsUrl = process.env.NEXT_PUBLIC_SYNC_URL ?? 'ws://localhost:1234';

  const provider = new WebsocketProvider(wsUrl, docName, doc, {
    params: { token: opts.token },
    // Reconnect with exponential-ish backoff handled by y-websocket.
    connect: true,
  });

  const indexeddb = new IndexeddbPersistence(docName, doc);

  let synced = false;
  let currentStatus: CollabStatus = 'connecting';

  const emit = (): void => {
    if (!opts.onStatus) return;
    if (currentStatus === 'offline') {
      opts.onStatus('offline');
      return;
    }
    if (currentStatus === 'connected' && !synced) {
      opts.onStatus('syncing');
      return;
    }
    opts.onStatus(currentStatus);
  };

  // y-websocket's Observable forwards call arguments as-is, so payloads reach
  // listeners in different shapes depending on the emit site: status is
  // {status} but sync is emit('sync', [state]) — a bare boolean or a 1-element
  // array. Reading a fixed shape left `synced` undefined forever, which pinned
  // the indicator on "Syncing" until a full reload. Normalize defensively.
  const resolveStatus = (payload: unknown): string => {
    const v = Array.isArray(payload) ? payload[0] : payload;
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && 'status' in v) return String((v as { status: unknown }).status);
    return 'connecting';
  };
  const resolveSynced = (payload: unknown): boolean => {
    const v = Array.isArray(payload) ? payload[0] : payload;
    if (typeof v === 'boolean') return v;
    if (v && typeof v === 'object' && 'synced' in v) return Boolean((v as { synced: unknown }).synced);
    return Boolean(v);
  };

  const onStatusEvent = (payload: unknown): void => {
    const status = resolveStatus(payload);
    currentStatus = status === 'connected' ? 'connected' : status === 'disconnected' ? 'offline' : 'connecting';
    emit();
  };
  const onSyncEvent = (payload: unknown): void => {
    synced = resolveSynced(payload);
    opts.onSync?.(synced);
    if (synced && currentStatus !== 'offline') currentStatus = 'connected';
    emit();
  };

  provider.on('status', onStatusEvent);
  provider.on('sync', onSyncEvent);

  // y-websocket only understands sync (0) and awareness (1) frames. The sync
  // server also sends custom JSON frames (127: hello / doc:reset / perm:role)
  // which would make its message handler log "Unable to compute message" on
  // every connection. The browser acts on doc:reset / role changes via close
  // codes (4410 / 4403) instead, so intercept and drop custom frames — after
  // re-patching on every reconnect, because y-websocket recreates the socket.
  const patchedSockets = new WeakSet<WebSocket>();
  const patchSocketForCustomFrames = (): void => {
    const ws = provider.ws as WebSocket | null;
    if (!ws || patchedSockets.has(ws)) return;
    const original = ws.onmessage;
    if (!original) return; // handler not attached yet — retry on next status
    ws.onmessage = (event: MessageEvent): void => {
      const data = event.data;
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const bytes =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        // varUint type byte: only values < 128 here, so one byte is enough.
        if (bytes[0] === WS_MESSAGE_CUSTOM) return;
      }
      original.call(ws, event);
    };
    patchedSockets.add(ws);
  };
  provider.on('status', patchSocketForCustomFrames);
  patchSocketForCustomFrames();

  // Surface browser-level connectivity (e.g. Wi-Fi dropped) as offline even
  // while the websocket thinks it is still connected.
  const onBrowserOffline = (): void => {
    currentStatus = 'offline';
    emit();
  };
  const onBrowserOnline = (): void => {
    currentStatus = provider.wsconnected ? 'connected' : 'connecting';
    emit();
  };
  window.addEventListener('offline', onBrowserOffline);
  window.addEventListener('online', onBrowserOnline);

  // Refresh the WS token and reconnect after auth failures (4401/4403 or
  // session token expiry) so long-lived sessions survive token TTLs.
  // 4410 = document reset (version restore): tell the app to reload.
  const onClose = (event: unknown): void => {
    const code = (event as { code?: number } | undefined)?.code;
    if (code === 4410) {
      opts.onDocReset?.();
      return;
    }
    if (code === 401 || code === 4401 || code === 4403) {
      void (async () => {
        const token = await fetchToken();
        if (!token) return;
        (provider as unknown as { params: Record<string, string> }).params['token'] = token;
        provider.connect();
      })();
    }
  };
  provider.on('connection-close', onClose);

  void indexeddb.whenSynced.then(() => {
    // Local offline edits are in; the websocket sync merges the rest.
  });

  return {
    doc,
    provider,
    indexeddb,
    destroy: () => {
      provider.off('status', onStatusEvent);
      provider.off('status', patchSocketForCustomFrames);
      provider.off('sync', onSyncEvent);
      provider.off('connection-close', onClose);
      window.removeEventListener('offline', onBrowserOffline);
      window.removeEventListener('online', onBrowserOnline);
      provider.destroy();
      void indexeddb.destroy();
      doc.destroy();
    },
  };
}

/** One-shot fetch of a WS token for the signed-in user. */
export async function getWsToken(): Promise<string | null> {
  return fetchToken();
}

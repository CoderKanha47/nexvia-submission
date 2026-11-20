import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(__dirname, '../../.env') });

import { SignJWT } from 'jose';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Role } from '@nexvia/shared';

export const WS_URL = process.env['NEXT_PUBLIC_SYNC_URL'] ?? 'ws://localhost:1234';

const secret = new TextEncoder().encode(
  process.env['WS_TOKEN_SECRET'] ?? process.env['NEXTAUTH_SECRET'] ?? 'dev-secret',
);

export async function signUserToken(userId: string, name?: string): Promise<string> {
  return new SignJWT({ typ: 'user', sub: userId, name: name ?? 'Test User', email: 'test@demo.dev' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setIssuer('nexvia-web')
    .sign(secret);
}

export async function signShareToken(
  userId: string,
  pageId: string,
  role: Role,
): Promise<string> {
  return new SignJWT({ typ: 'share', sub: userId, pageId, role, sid: 'share-test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setIssuer('nexvia-web')
    .sign(secret);
}

export interface TestClient {
  doc: Y.Doc;
  provider: WebsocketProvider;
  fragment: Y.XmlFragment;
  waitForSync: () => Promise<void>;
  destroy: () => void;
}

export function roomNameFor(pageId: string, epoch = 1): string {
  return `page:${pageId}:e${epoch}`;
}

export function connectClient(token: string, room: string): TestClient {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(WS_URL, room, doc, {
    params: { token },
    // Node 22+/24 ships a global WebSocket implementation.
    WebSocketPolyfill: globalThis.WebSocket as never,
    // Two providers in one Node process would otherwise sync through
    // lib0's in-process BroadcastChannel, bypassing the server and
    // defeating server-side permission enforcement in tests.
    disableBc: true,
  });
  const fragment = doc.getXmlFragment('default');
  const waitForSync = () =>
    new Promise<void>((resolveSync) => {
      if (provider.synced) {
        resolveSync();
        return;
      }
      // y-websocket emits 'sync' with [state] (lib0 Observable array payload).
      const onSync = (arg: unknown): void => {
        const state = Array.isArray(arg) ? arg[0] : arg;
        const synced =
          typeof state === 'boolean' ? state : (state as { synced?: boolean } | undefined)?.synced;
        if (synced) {
          provider.off('sync', onSync);
          resolveSync();
        }
      };
      provider.on('sync', onSync);
    });
  return {
    doc,
    provider,
    fragment,
    waitForSync,
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}

export function fragmentText(fragment: Y.XmlFragment): string {
  const parts: string[] = [];
  fragment.forEach((node) => {
    if (node instanceof Y.XmlText) parts.push(node.toString());
    else if (node instanceof Y.XmlElement) {
      node.forEach((child) => {
        if (child instanceof Y.XmlText) parts.push(child.toString());
      });
      parts.push('\n');
    }
  });
  return parts.join('').trim();
}

export function clientText(client: TestClient): string {
  return fragmentText(client.fragment);
}

export function insertParagraph(fragment: Y.XmlFragment, text: string): void {
  const el = new Y.XmlElement('paragraph');
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  fragment.insert(fragment.length, [el]);
}

export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 10_000,
  intervalMs = 50,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('waitFor timed out');
}

export function updateToText(update: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  const fragment = doc.getXmlFragment('default');
  const text = fragmentText(fragment);
  doc.destroy();
  return text;
}

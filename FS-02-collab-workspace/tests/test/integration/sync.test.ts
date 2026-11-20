import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { prisma } from '@nexvia/db';
import {
  clientText,
  connectClient,
  insertParagraph,
  roomNameFor,
  signShareToken,
  signUserToken,
  updateToText,
  waitFor,
  type TestClient,
} from '../../helpers/sync';

const SEED_WORKSPACE_SLUG = 'acme-hq';
const SEED_ALICE = 'alice@demo.dev';
const SEED_BOB = 'bob@demo.dev';
const SEED_CAROL = 'carol@demo.dev';

async function createTestPage(): Promise<{ pageId: string; aliceId: string; bobId: string; carolId: string }> {
  const [alice, bob, carol, workspace] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: SEED_ALICE } }),
    prisma.user.findUniqueOrThrow({ where: { email: SEED_BOB } }),
    prisma.user.findUniqueOrThrow({ where: { email: SEED_CAROL } }),
    prisma.workspace.findUniqueOrThrow({ where: { slug: SEED_WORKSPACE_SLUG } }),
  ]);
  const doc = new Y.Doc();
  const page = await prisma.page.create({
    data: {
      title: `Sync test ${Date.now()}`,
      workspaceId: workspace.id,
      order: 999,
      createdById: alice.id,
      document: { create: { state: Buffer.from(Y.encodeStateAsUpdate(doc)) } },
    },
  });
  doc.destroy();
  return { pageId: page.id, aliceId: alice.id, bobId: bob.id, carolId: carol.id };
}

describe('sync server integration', () => {
  let pageId: string;
  let aliceId: string;
  let bobId: string;
  let carolId: string;
  const clients: TestClient[] = [];

  beforeAll(async () => {
    const created = await createTestPage();
    pageId = created.pageId;
    aliceId = created.aliceId;
    bobId = created.bobId;
    carolId = created.carolId;
  }, 30_000);

  afterAll(async () => {
    for (const c of clients) c.destroy();
    await prisma.page.delete({ where: { id: pageId } }).catch(() => undefined);
  });

  it('rejects connections without a token', async () => {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_SYNC_URL ?? 'ws://localhost:1234',
      roomNameFor(pageId),
      doc,
      { WebSocketPolyfill: globalThis.WebSocket, params: {}, disableBc: true },
    );
    const failed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      provider.on('connection-close', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    provider.destroy();
    doc.destroy();
    expect(failed).toBe(true);
  }, 15_000);

  it('two clients editing concurrently converge to identical text', async () => {
    const tokenA = await signUserToken(aliceId, 'Alice');
    const tokenB = await signUserToken(bobId, 'Bob');
    const room = roomNameFor(pageId);

    const a = connectClient(tokenA, room);
    const b = connectClient(tokenB, room);
    clients.push(a, b);
    await Promise.all([a.waitForSync(), b.waitForSync()]);

    insertParagraph(a.fragment, 'Hello from Alice');
    insertParagraph(b.fragment, 'Hello from Bob');

    await waitFor(() => clientText(a).includes('Hello from Bob') && clientText(b).includes('Hello from Alice'));

    expect(clientText(a)).toBe(clientText(b));
    expect(clientText(a)).toContain('Hello from Alice');
    expect(clientText(a)).toContain('Hello from Bob');
  }, 30_000);

  it('persists document state to Postgres and loads it for new clients', async () => {
    const room = roomNameFor(pageId);
    // Make a distinctive edit with a fresh client, then disconnect everyone.
    const token = await signUserToken(aliceId);
    const editor = connectClient(token, room);
    await editor.waitForSync();
    insertParagraph(editor.fragment, `persisted-${pageId.slice(-6)}`);
    await waitFor(() => clientText(editor).includes(`persisted-${pageId.slice(-6)}`));
    editor.destroy();

    // Disconnect any previously connected clients so the room can flush + GC.
    for (const c of clients.splice(0)) c.destroy();

    // Debounced save is 1.2s; give it time.
    {
      const marker = `persisted-${pageId.slice(-6)}`;
      const deadline = Date.now() + 15_000;
      let persisted = false;
      while (Date.now() < deadline) {
        const row = await prisma.pageDocument.findUnique({ where: { pageId } });
        if (row && updateToText(new Uint8Array(row.state)).includes(marker)) {
          persisted = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      expect(persisted).toBe(true);
    }

    // A brand-new client loads the persisted state.
    const reader = connectClient(await signUserToken(bobId), room);
    clients.push(reader);
    await reader.waitForSync();
    expect(clientText(reader)).toContain(`persisted-${pageId.slice(-6)}`);
  }, 45_000);

  it('drops write updates from comment-only users', async () => {
    const room = roomNameFor(pageId);
    const carolToken = await signUserToken(carolId, 'Carol');
    const carol = connectClient(carolToken, room);
    const watcher = connectClient(await signUserToken(aliceId), room);
    clients.push(carol, watcher);
    await Promise.all([carol.waitForSync(), watcher.waitForSync()]);

    const marker = `carol-should-not-persist-${Date.now()}`;
    insertParagraph(carol.fragment, marker);

    // Carol's local doc shows her text (optimistic), the server never accepts it.
    await waitFor(() => clientText(carol).includes(marker));
    await new Promise((r) => setTimeout(r, 1500));
    expect(clientText(watcher)).not.toContain(marker);

    // Server-side truth: load a fresh doc from a new client.
    const fresh = connectClient(await signUserToken(aliceId), room);
    clients.push(fresh);
    await fresh.waitForSync();
    expect(clientText(fresh)).not.toContain(marker);
  }, 30_000);

  it('share-token connections are scoped to their page and role', async () => {
    const room = roomNameFor(pageId);
    const shareToken = await signShareToken(aliceId, pageId, 'VIEW');
    const viewer = connectClient(shareToken, room);
    clients.push(viewer);
    await viewer.waitForSync();

    const marker = `share-viewer-${Date.now()}`;
    insertParagraph(viewer.fragment, marker);
    await waitFor(() => clientText(viewer).includes(marker));
    await new Promise((r) => setTimeout(r, 1200));

    const fresh = connectClient(await signUserToken(bobId), room);
    clients.push(fresh);
    await fresh.waitForSync();
    expect(clientText(fresh)).not.toContain(marker);

    // A share token for a DIFFERENT page must not connect to this room.
    const otherPage = await createTestPage();
    const wrongToken = await signShareToken(aliceId, otherPage.pageId, 'VIEW');
    const rejected = await new Promise<boolean>((resolve) => {
      const c = connectClient(wrongToken, room);
      const timer = setTimeout(() => {
        c.destroy();
        resolve(false);
      }, 5000);
      c.provider.on('connection-close', () => {
        clearTimeout(timer);
        c.destroy();
        resolve(true);
      });
    });
    expect(rejected).toBe(true);
    await prisma.page.delete({ where: { id: otherPage.pageId } }).catch(() => undefined);
  }, 30_000);
});

import { describe, expect, it } from 'vitest';
import { prisma } from '@nexvia/db';
import {
  clientText,
  connectClient,
  insertParagraph,
  roomNameFor,
  signUserToken,
  waitFor,
} from '../../helpers/sync';

/**
 * Offline editing: a client that loses its connection keeps editing locally
 * (in the browser these updates also land in IndexedDB via y-indexeddb) and
 * the CRDT merges everything seamlessly on reconnect. Here we exercise the
 * merge half in Node; the IndexedDB half runs in the browser.
 */
describe('offline editing and reconnect merge', () => {
  it('merges edits made while disconnected once the client reconnects', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'alice@demo.dev' } });
    const workspace = await prisma.workspace.findFirstOrThrow();
    const page = await prisma.page.findFirstOrThrow({
      where: { workspaceId: workspace.id, isDeleted: false },
      orderBy: { order: 'asc' },
      include: { document: true },
    });
    const token = await signUserToken(user.id, user.name ?? undefined);
    // The seed page's epoch changes when versions are restored — read it live
    // instead of assuming epoch 1 (stale epochs are rejected with 409).
    const room = roomNameFor(page.id, page.document?.epoch ?? 1);
    // Unique markers per run: the doc persists in Postgres across runs, so
    // fixed strings from a previous run would satisfy (or poison) assertions.
    const tag = Date.now().toString(36);
    const mConnect = `before-disconnect-${tag}`;
    const mOffline = `written-while-offline-${tag}`;
    const mPeer = `written-while-peer-offline-${tag}`;
    console.log('[offline] connecting clients');

    const online = connectClient(token, room);
    const offline = connectClient(token, room);
    await Promise.all([online.waitForSync(), offline.waitForSync()]);
    console.log('[offline] both synced');

    insertParagraph(offline.fragment, mConnect);
    await waitFor(() => clientText(online).includes(mConnect));
    console.log('[offline] initial replication ok');

    // Drop the connection — local edits continue to accumulate in the doc.
    offline.provider.disconnect();
    await waitFor(() => !offline.provider.wsconnected);
    console.log('[offline] disconnected');

    insertParagraph(offline.fragment, mOffline);

    // Meanwhile the online peer keeps editing too.
    insertParagraph(online.fragment, mPeer);
    await waitFor(() => !clientText(online).includes(mOffline));
    console.log('[offline] offline edit not leaked');

    // Reconnect: both sides must converge on the union of edits.
    offline.provider.connect();
    console.log('[offline] reconnecting');
    await waitFor(() => clientText(offline).includes(mPeer));
    await waitFor(() => clientText(online).includes(mOffline));

    const a = clientText(online);
    const b = clientText(offline);
    expect(a).toBe(b);
    expect(a).toContain(mConnect);
    expect(a).toContain(mOffline);
    expect(a).toContain(mPeer);

    online.destroy();
    offline.destroy();
  }, 20_000);
});

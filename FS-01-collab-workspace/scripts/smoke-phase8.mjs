/* Phase 8 smoke: version save (dedupe), live edit via sync server, restore with epoch bump. */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SYNC = process.env.SYNC_URL ?? 'ws://localhost:1234';

class Jar {
  constructor() { this.cookies = new Map(); }
  absorb(res) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

function makeCall(jar) {
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { Cookie: jar.header(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    jar.absorb(res);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
    return { status: res.status, data };
  };
}

async function loginUser(email) {
  const jar = new Jar();
  const call = makeCall(jar);
  const csrf = await call('GET', '/api/auth/csrf');
  const login = await call('POST', '/api/auth/callback/credentials', {
    csrfToken: csrf.data.csrfToken, email, password: 'password123', json: true,
  });
  if (login.status !== 200 && login.status !== 302) throw new Error(`login ${email} failed: ${login.status}`);
  const session = await call('GET', '/api/auth/session');
  if (!session.data?.user) throw new Error(`session missing for ${email}`);
  return { call, jar };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Edit the page doc through the sync server so Postgres gets new content. */
async function editViaSync(cookieHeader, pageId, epoch, text) {
  const tokenRes = await fetch(`${BASE}/api/auth/ws-token`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  if (!tokenRes.ok) throw new Error(`ws-token failed: ${tokenRes.status}`);
  const { token } = await tokenRes.json();
  if (!token) throw new Error('no ws token');

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(SYNC, `page:${pageId}:e${epoch}`, doc, {
    params: { token },
    disableBc: true,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sync connect timeout')), 8000);
    provider.on('status', (e) => {
      const s = Array.isArray(e) ? e[0] : e;
      if (s?.status === 'disconnected') {
        clearTimeout(timer);
        reject(new Error('sync disconnected before sync'));
      }
    });
    provider.on('sync', (isSynced) => {
      const synced = Array.isArray(isSynced) ? isSynced[0] : isSynced;
      if (synced) { clearTimeout(timer); resolve(); }
    });
  });

  doc.getText('default').insert(0, text);
  await sleep(2500); // persist debounce is 1.2s — wait for save
  provider.destroy();
  doc.destroy();
}

async function main() {
  const { call: alice, jar: aliceJar } = await loginUser('alice@demo.dev');
  const { call: carol } = await loginUser('carol@demo.dev');
  console.log('logins ok');

  const ws = await alice('GET', '/api/workspaces');
  const workspace = ws.data.workspaces[0];
  const pages = await alice('GET', `/api/workspaces/${workspace.id}/tree`);
  const page = pages.data.pages[0];

  const pageRes = await alice('GET', `/api/pages/${page.id}`);
  const epoch0 = pageRes.data.page.epoch;
  console.log('page:', page.id, 'epoch:', epoch0);

  const list0 = await alice('GET', `/api/pages/${page.id}/versions`);
  console.log('list versions:', list0.status, 'count:', list0.data.versions?.length);
  if (list0.status !== 200 || !Array.isArray(list0.data.versions)) throw new Error('list failed');

  // Make the document content distinct, then snapshot it.
  const markerA = `Smoke A ${Date.now()} `;
  await editViaSync(aliceJar.header(), page.id, epoch0, markerA);
  console.log('edited doc (A) via sync server');

  const save1 = await alice('POST', `/api/pages/${page.id}/versions`, { label: 'Smoke v1' });
  console.log('save manual:', save1.status, save1.data.versionId ?? save1.data);
  if (save1.status !== 200) throw new Error('manual save failed');

  // Immediate re-save with no changes → dedupe.
  const save2 = await alice('POST', `/api/pages/${page.id}/versions`, { label: 'Smoke v1 again' });
  console.log('save again (dedupe):', save2.status, 'duplicate:', save2.data.duplicate);
  if (!save2.data.duplicate) throw new Error('expected duplicate on unchanged doc');

  // COMMENT role cannot save.
  const carolSave = await carol('POST', `/api/pages/${page.id}/versions`, {});
  console.log('COMMENT-role save:', carolSave.status, '(expect 403)');
  if (carolSave.status !== 403) throw new Error('COMMENT should not save versions');

  // Change the document again so restore has something to undo.
  await editViaSync(aliceJar.header(), page.id, epoch0, `Smoke B ${Date.now()} `);
  console.log('edited doc (B) via sync server');

  // Restore the saved version → epoch bumps.
  const restore = await alice('POST', `/api/versions/${save1.data.versionId}/restore`, {});
  console.log('restore:', restore.status, restore.data);
  if (restore.status !== 200) throw new Error('restore failed');
  const epoch1 = restore.data.epoch;
  if (epoch1 !== epoch0 + 1) throw new Error(`expected epoch ${epoch0 + 1}, got ${epoch1}`);

  const pageRes2 = await alice('GET', `/api/pages/${page.id}`);
  console.log('page epoch after restore:', pageRes2.data.page.epoch, '(expect', epoch1, ')');
  if (pageRes2.data.page.epoch !== epoch1) throw new Error('epoch not persisted');

  // A pre-restore snapshot should exist.
  const list1 = await alice('GET', `/api/pages/${page.id}/versions`);
  const preRestore = list1.data.versions.find((v) => v.type === 'RESTORE');
  console.log('pre-restore version present:', !!preRestore, preRestore?.label);
  if (!preRestore) throw new Error('expected RESTORE-type version');

  // The restored doc content should equal the saved version: snapshot again
  // and compare checksums (dedupe won't trigger — newest version is the
  // pre-restore snapshot of the *intervening* state).
  const save3 = await alice('POST', `/api/pages/${page.id}/versions`, { label: 'post-restore check' });
  console.log('save after restore:', save3.status, save3.data.versionId ?? save3.data);
  if (save3.status !== 200) throw new Error('post-restore save failed');
  const list2 = await alice('GET', `/api/pages/${page.id}/versions`);
  const v1 = list2.data.versions.find((v) => v.id === save1.data.versionId);
  const v3 = list2.data.versions.find((v) => v.id === save3.data.versionId);
  console.log('checksums match:', v1?.checksum === v3?.checksum);
  if (!v1 || !v3 || v1.checksum !== v3.checksum) throw new Error('restored content should equal the saved version');

  // Restoring the current state is a no-op.
  const noop = await alice('POST', `/api/versions/${save1.data.versionId}/restore`, {});
  console.log('restore same version again (expect 400 no-op):', noop.status, noop.data);
  if (noop.status !== 400) throw new Error('expected 400 for no-op restore');

  // COMMENT role cannot restore.
  const carolRestore = await carol('POST', `/api/versions/${save1.data.versionId}/restore`, {});
  console.log('COMMENT-role restore:', carolRestore.status, '(expect 403)');
  if (carolRestore.status !== 403) throw new Error('COMMENT should not restore');

  console.log('PHASE8 SMOKE PASS');
}

main().catch((e) => {
  console.error('PHASE8 SMOKE FAIL:', e);
  process.exit(1);
});

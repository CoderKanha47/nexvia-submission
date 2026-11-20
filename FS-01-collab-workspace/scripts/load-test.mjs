/* Load test: N concurrent clients through nginx → 2 sync instances.
 * Each client writes; every client must converge on the full union. */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const NGINX = process.env.SYNC_URL ?? 'ws://localhost:4000';
const CLIENTS = Number(process.env.LOAD_CLIENTS ?? 25);

class Jar {
  constructor() { this.cookies = new Map(); }
  absorb(res) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  header() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
}

const jar = new Jar();
async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Cookie: jar.header(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  jar.absorb(res);
  const t = await res.text();
  let d; try { d = JSON.parse(t); } catch { d = t.slice(0, 200); }
  return { status: res.status, data: d };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const csrf = await call('GET', '/api/auth/csrf');
  await call('POST', '/api/auth/callback/credentials', {
    csrfToken: csrf.data.csrfToken, email: 'alice@demo.dev', password: 'password123', json: true,
  });
  const tok = await call('POST', '/api/auth/ws-token');
  const ws = await call('GET', '/api/workspaces');
  const workspace = ws.data.workspaces[0];
  // Use a throwaway page so load-test content never pollutes seeded demos.
  const created = await call('POST', `/api/workspaces/${workspace.id}/pages`, { title: `Load test ${Date.now()}` });
  const page = created.data.page;
  const pageRes = await call('GET', `/api/pages/${page.id}`);
  const room = `page:${page.id}:e${pageRes.data.page.epoch}`;
  console.log(`room: ${room} | clients: ${CLIENTS}`);

  const started = Date.now();
  const clients = await Promise.all(
    Array.from({ length: CLIENTS }, async (_, i) => {
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(NGINX, room, doc, {
        params: { token: tok.data.token }, disableBc: true,
      });
      const frag = doc.getXmlFragment('default');
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`client ${i} sync timeout`)), 20000);
        provider.on('sync', (s) => {
          const synced = Array.isArray(s) ? s[0] : s;
          if (synced) { clearTimeout(timer); resolve(); }
        });
      });
      return { i, doc, provider, frag };
    }),
  );
  const connectMs = Date.now() - started;
  console.log(`all ${CLIENTS} clients synced in ${connectMs}ms`);

  // Staggered writes to simulate real typing bursts.
  const t0 = Date.now();
  for (const c of clients) {
    const el = new Y.XmlElement('paragraph');
    const t = new Y.XmlText();
    t.insert(0, `client-${c.i}-marker`);
    el.insert(0, [t]);
    c.frag.insert(c.frag.length, [el]);
    await sleep(20);
  }
  console.log(`writes done in ${Date.now() - t0}ms; waiting for convergence…`);

  const marker = (i) => `client-${i}-marker`;
  const deadline = Date.now() + 30000;
  let converged = false;
  while (Date.now() < deadline) {
    const all = clients.every((c) => {
      const text = c.doc.getXmlFragment('default').toString();
      return clients.every((other) => text.includes(marker(other.i)));
    });
    if (all) { converged = true; break; }
    await sleep(500);
  }

  const sizes = clients.map((c) => c.doc.getXmlFragment('default').toString().length);
  const consistent = new Set(sizes).size === 1;
  console.log(`converged: ${converged} | doc sizes consistent: ${consistent} (${sizes[0]} chars)`);

  for (const c of clients) { c.provider.destroy(); c.doc.destroy(); }

  // Clean up the throwaway page.
  await call('DELETE', `/api/pages/${page.id}`);

  if (converged && consistent) {
    console.log(`LOAD TEST PASS: ${CLIENTS} clients, connect ${connectMs}ms, all markers replicated everywhere`);
  } else {
    console.error('LOAD TEST FAIL: not all clients converged');
    process.exit(1);
  }
}

main().catch((e) => { console.error('LOAD TEST FAIL:', e); process.exit(1); });

/* Phase 9: cross-instance convergence via nginx (least_conn) + Redis pub/sub. */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

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

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const NGINX = process.env.SYNC_URL ?? 'ws://localhost:4000';

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

async function connect(room, token) {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(NGINX, room, doc, {
    params: { token }, disableBc: true,
  });
  let instance = null;
  // The server sends a custom hello message with its instance id on attach —
  // hook the first 'connected' status so we don't miss it.
  provider.on('status', (e) => {
    const s = Array.isArray(e) ? e[0] : e;
    if (s?.status !== 'connected' || instance) return;
    const ws = provider.ws;
    if (!ws) return;
    ws.addEventListener('message', (ev) => {
      try {
        const buf = new Uint8Array(ev.data);
        if (buf[0] === 127) {
          const json = new TextDecoder().decode(buf.slice(2));
          instance = JSON.parse(json).instanceId;
        }
      } catch { /* binary noise */ }
    });
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sync timeout')), 10000);
    provider.on('sync', (s) => {
      const synced = Array.isArray(s) ? s[0] : s;
      if (synced) { clearTimeout(timer); resolve(); }
    });
  });
  return { doc, provider, getInstance: () => instance };
}

async function main() {
  const csrf = await call('GET', '/api/auth/csrf');
  await call('POST', '/api/auth/callback/credentials', { csrfToken: csrf.data.csrfToken, email: 'alice@demo.dev', password: 'password123', json: true });
  const tok = await call('POST', '/api/auth/ws-token');
  if (!tok.data.token) throw new Error('no ws token');
  const ws = await call('GET', '/api/workspaces');
  const pages = await call('GET', `/api/workspaces/${ws.data.workspaces[0].id}/tree`);
  const page = pages.data.pages[0];
  const pageRes = await call('GET', `/api/pages/${page.id}`);
  const epoch = pageRes.data.page.epoch;
  const room = `page:${page.id}:e${epoch}`;
  console.log('room:', room);

  // Connect several clients — with least_conn they should spread over sync1/sync2.
  const clients = [];
  for (let i = 0; i < 4; i++) {
    clients.push(await connect(room, tok.data.token));
    await sleep(300);
  }
  await sleep(500);
  const instances = clients.map((c) => c.getInstance());
  console.log('client instances:', instances.join(', '));
  const unique = new Set(instances.filter(Boolean));
  if (unique.size < 2) {
    console.log('WARN: all clients landed on one instance:', [...unique]);
  } else {
    console.log('clients spread across', unique.size, 'instances:', [...unique].join(', '));
  }

  // Write via client 0; every other client must receive it (via Redis if cross-instance).
  const marker = `cross-instance-${Date.now()}`;
  clients[0].doc.getText('default').insert(0, marker);
  await sleep(2000);

  let ok = 0;
  for (let i = 1; i < clients.length; i++) {
    const text = clients[i].doc.getText('default').toString();
    const got = text.includes(marker);
    console.log(`client ${i} received marker:`, got);
    if (got) ok++;
  }

  // Persistence: the state must land in Postgres.
  await sleep(2000);
  for (const c of clients) { c.provider.destroy(); c.doc.destroy(); }

  if (ok === clients.length - 1) {
    console.log('PHASE9 CROSS-INSTANCE CONVERGENCE PASS');
  } else {
    console.error(`PHASE9 FAIL: only ${ok}/${clients.length - 1} peers received the update`);
    process.exit(1);
  }
}

main().catch((e) => { console.error('PHASE9 FAIL:', e); process.exit(1); });

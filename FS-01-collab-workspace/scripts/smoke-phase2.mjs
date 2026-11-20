/* Quick runtime smoke test for phase 2 APIs. Run with: node scripts/smoke-phase2.mjs */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

class Jar {
  constructor() {
    this.cookies = new Map();
  }
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

async function main() {
  const jar = new Jar();
  const call = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Cookie: jar.header(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    jar.absorb(res);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text.slice(0, 120);
    }
    return { status: res.status, data };
  };

  const email = `smoke-${Date.now()}@demo.dev`;
  console.log('register:', await call('POST', '/api/auth/register', { name: 'Smoke Tester', email, password: 'password123' }));

  const csrf = await call('GET', '/api/auth/csrf');
  console.log('csrf:', csrf.status);
  const login = await call('POST', '/api/auth/callback/credentials', {
    csrfToken: csrf.data.csrfToken,
    email,
    password: 'password123',
    json: true,
  });
  console.log('login:', login.status);

  const session = await call('GET', '/api/auth/session');
  console.log('session:', session.status, session.data?.user?.email);

  const ws = await call('POST', '/api/workspaces', { name: 'Smoke WS' });
  console.log('create workspace:', ws.status, ws.data?.workspace?.id);
  const wsId = ws.data.workspace.id;

  const tree0 = await call('GET', `/api/workspaces/${wsId}/tree`);
  console.log('tree:', tree0.status, 'pages:', tree0.data.pages?.length);

  const page = await call('POST', `/api/workspaces/${wsId}/pages`, { title: 'Smoke page' });
  console.log('create page:', page.status, page.data?.page?.id);
  const pageId = page.data.page.id;

  console.log('rename page:', await call('PATCH', `/api/pages/${pageId}`, { title: 'Smoke page renamed' }));
  console.log('favorite:', await call('POST', `/api/pages/${pageId}/favorite`));
  const dup = await call('POST', `/api/pages/${pageId}/duplicate`);
  console.log('duplicate:', dup.status, dup.data?.page?.title);
  console.log('invite link:', await call('POST', `/api/workspaces/${wsId}/invites`, { role: 'VIEW' }));
  console.log('ws token:', await call('POST', '/api/auth/ws-token'));
  console.log('trash:', await call('GET', `/api/workspaces/${wsId}/trash`));
  console.log('soft delete:', await call('DELETE', `/api/pages/${pageId}`));
  console.log('restore:', await call('POST', `/api/pages/${pageId}/restore`));
  console.log('reorder:', await call('POST', `/api/workspaces/${wsId}/reorder`, { items: [{ id: pageId, parentId: null, order: 5 }] }));

  // unauthorized access check with fresh jar
  const anon = new Jar();
  const res = await fetch(`${BASE}/api/workspaces/${wsId}/tree`, { headers: { Cookie: anon.header() } });
  console.log('anon tree (expect 401):', res.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

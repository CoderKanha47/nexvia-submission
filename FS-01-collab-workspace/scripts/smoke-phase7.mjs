/* Phase 7 smoke: comment threads, replies, resolve, delete. Requires web on :3000. */
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

function makeCall(jar) {
  return async (method, path, body) => {
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
      data = text.slice(0, 200);
    }
    return { status: res.status, data };
  };
}

async function loginUser(email) {
  const jar = new Jar();
  const call = makeCall(jar);
  const csrf = await call('GET', '/api/auth/csrf');
  const login = await call('POST', '/api/auth/callback/credentials', {
    csrfToken: csrf.data.csrfToken,
    email,
    password: 'password123',
    json: true,
  });
  // next-auth redirects (302) on success; the session cookie arrives with it.
  if (login.status !== 200 && login.status !== 302) throw new Error(`login ${email} failed: ${login.status} ${JSON.stringify(login.data)}`);
  const session = await call('GET', '/api/auth/session');
  if (!session.data?.user) throw new Error(`session missing for ${email}`);
  return call;
}

async function main() {
  const alice = await loginUser('alice@demo.dev');
  const bob = await loginUser('bob@demo.dev');
  const carol = await loginUser('carol@demo.dev');
  console.log('logins ok');

  const ws = await alice('GET', '/api/workspaces');
  const workspace = ws.data.workspaces[0];
  const pages = await alice('GET', `/api/workspaces/${workspace.id}/tree`);
  const page = pages.data.pages.find((p) => !p.isDeleted) ?? pages.data.pages[0];
  console.log('page:', page.id, page.title);

  const members = await alice('GET', `/api/workspaces/${workspace.id}/members`);
  console.log('members:', members.status, members.data.members.map((m) => `${m.email}:${m.role}`).join(', '));
  const bobId = members.data.members.find((m) => m.email === 'bob@demo.dev')?.userId;

  // Alice (OWNER) creates a thread with quote + mention of Bob.
  const create = await alice('POST', `/api/pages/${page.id}/threads`, {
    body: `Please review @[Bob](${bobId})`,
    quote: 'Hello world',
    mentions: [bobId],
  });
  console.log('create thread:', create.status, create.data.thread?.id ?? create.data);
  if (create.status !== 200 && create.status !== 201) throw new Error('create failed');
  const threadId = create.data.thread.id;

  // Bob (EDIT) replies.
  const reply = await bob('POST', `/api/threads/${threadId}`, {
    body: 'Looks good to me',
    mentions: [],
  });
  console.log('reply:', reply.status);

  // List as Bob — thread visible with 2 comments.
  const list = await bob('GET', `/api/pages/${page.id}/threads`);
  const found = list.data.threads.find((t) => t.id === threadId);
  console.log('list:', list.status, 'threads:', list.data.threads.length, 'comments in thread:', found?.comments?.length);
  if (!found || found.comments.length !== 2) throw new Error('expected 2 comments in thread');

  // Carol (COMMENT) resolves the thread.
  const resolve = await carol('PATCH', `/api/threads/${threadId}`, { resolved: true });
  console.log('resolve:', resolve.status);
  if (resolve.status !== 200) throw new Error('resolve failed');

  // Hidden by default, visible with includeResolved.
  const listDefault = await bob('GET', `/api/pages/${page.id}/threads`);
  const listAll = await bob('GET', `/api/pages/${page.id}/threads?includeResolved=true`);
  const hidden = !listDefault.data.threads.some((t) => t.id === threadId);
  const visible = listAll.data.threads.some((t) => t.id === threadId);
  console.log('after resolve — hidden by default:', hidden, 'visible with flag:', visible);
  if (!hidden || !visible) throw new Error('resolved visibility wrong');

  // Alice deletes her own first comment (soft delete) — it should vanish from listings.
  const firstCommentId = listAll.data.threads.find((t) => t.id === threadId).comments[0].id;
  const del = await alice('DELETE', `/api/comments/${firstCommentId}`);
  console.log('delete own comment:', del.status, del.data);
  if (del.status !== 200) throw new Error('delete failed');

  // Bob cannot delete Carol's resolve authorship / Alice's comment — verify VIEW cannot comment.
  // Carol's reply remains; Alice's comment is filtered out of GET.
  const listFinal = await bob('GET', `/api/pages/${page.id}/threads?includeResolved=true`);
  const thread = listFinal.data.threads.find((t) => t.id === threadId);
  const deletedGone = !thread.comments.some((c) => c.id === firstCommentId);
  console.log('deleted comment filtered from list:', deletedGone, '| remaining:', thread.comments.map((c) => c.body));
  if (!deletedGone) throw new Error('deleted comment should be filtered from list');

  // VIEW-role rejection: create a VIEW user? Seeded workspace has no VIEW member —
  // verify unauthorized (anonymous) is rejected instead.
  const anon = makeCall(new Jar());
  const anonCreate = await anon('POST', `/api/pages/${page.id}/threads`, { body: 'nope' });
  console.log('anonymous create:', anonCreate.status, '(expect 401)');
  if (anonCreate.status !== 401) throw new Error('anonymous should be 401');

  console.log('PHASE7 SMOKE PASS');
}

main().catch((e) => {
  console.error('PHASE7 SMOKE FAIL:', e);
  process.exit(1);
});

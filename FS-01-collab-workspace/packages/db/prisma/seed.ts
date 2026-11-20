import { PrismaClient, Role, VersionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as Y from 'yjs';

const prisma = new PrismaClient();

function buildDoc(build: (doc: Y.Doc) => void): { state: Buffer; plain: string } {
  const doc = new Y.Doc();
  build(doc);
  const fragment = doc.getXmlFragment('default');
  const plain = fragmentToString(fragment);
  const state = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();
  return { state, plain };
}

function fragmentToString(fragment: Y.XmlFragment): string {
  const parts: string[] = [];
  const walk = (node: Y.XmlElement | Y.XmlFragment): void => {
    node.forEach((child) => {
      if (child instanceof Y.XmlText) parts.push(child.toString());
      else if (child instanceof Y.XmlElement) {
        if (child.nodeName === 'paragraph' || child.nodeName === 'hardBreak') parts.push('\n');
        walk(child);
      }
    });
  };
  walk(fragment);
  return parts.join('').trim();
}

function p(text: string, attrs?: Record<string, unknown>): Y.XmlElement {
  const el = new Y.XmlElement('paragraph');
  if (attrs) el.setAttribute('data-attrs', JSON.stringify(attrs));
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  return el;
}

function heading(text: string, level: number): Y.XmlElement {
  const el = new Y.XmlElement('heading');
  el.setAttribute('level', String(level));
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  return el;
}

function bullet(text: string): Y.XmlElement {
  const el = new Y.XmlElement('bulletList');
  const item = new Y.XmlElement('listItem');
  const inner = new Y.XmlElement('paragraph');
  const t = new Y.XmlText();
  t.insert(0, text);
  inner.insert(0, [t]);
  item.insert(0, [inner]);
  el.insert(0, [item]);
  return el;
}

async function main(): Promise<void> {
  console.log('[seed] starting');

  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.dev' },
    update: {},
    create: { email: 'alice@demo.dev', name: 'Alice Nguyen', passwordHash },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.dev' },
    update: {},
    create: { email: 'bob@demo.dev', name: 'Bob Martinez', passwordHash },
  });
  const carol = await prisma.user.upsert({
    where: { email: 'carol@demo.dev' },
    update: {},
    create: { email: 'carol@demo.dev', name: 'Carol Okafor', passwordHash },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-hq' },
    update: {},
    create: { name: 'Acme HQ', slug: 'acme-hq' },
  });

  const memberships: Array<[string, Role]> = [
    [alice.id, 'OWNER'],
    [bob.id, 'EDIT'],
    [carol.id, 'COMMENT'],
  ];
  for (const [userId, role] of memberships) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      update: { role },
      create: { workspaceId: workspace.id, userId, role },
    });
  }

  const existing = await prisma.page.findFirst({
    where: { workspaceId: workspace.id, title: 'Getting Started' },
  });
  if (existing) {
    console.log('[seed] workspace already seeded, skipping pages');
    return;
  }

  const gettingStarted = buildDoc((doc) => {
    const frag = doc.getXmlFragment('default');
    frag.insert(0, [
      heading('Welcome to Nexvia 👋', 1),
      p('This is a real-time collaborative workspace. Invite teammates, edit together, and watch changes sync instantly.'),
      heading('Try it out', 2),
      bullet('Open this page in two browser windows and type in both.'),
      bullet('Select some text and press Ctrl/Cmd + K or use the slash menu (/).'),
      bullet('Highlight text to leave a comment thread.'),
      p('Everything you type is stored as a CRDT (Yjs), so concurrent edits never conflict.'),
    ]);
  });

  const product = buildDoc((doc) => {
    const frag = doc.getXmlFragment('default');
    frag.insert(0, [
      heading('Product', 1),
      p('Home for product planning. Child pages live in the sidebar.'),
    ]);
  });

  const roadmap = buildDoc((doc) => {
    const frag = doc.getXmlFragment('default');
    frag.insert(0, [
      heading('Roadmap', 1),
      bullet('Q1 — Real-time editing with presence'),
      bullet('Q2 — Comments, mentions and version history'),
      bullet('Q3 — Public share links and permissions'),
    ]);
  });

  const notes = buildDoc((doc) => {
    const frag = doc.getXmlFragment('default');
    frag.insert(0, [
      heading('Meeting notes — kickoff', 1),
      p('Attendees: Alice, Bob, Carol'),
      p('Decisions: ship the collaborative editor first, permissions second.'),
    ]);
  });

  const root = await prisma.page.create({
    data: {
      title: 'Getting Started',
      icon: '👋',
      workspaceId: workspace.id,
      order: 1,
      createdById: alice.id,
      document: { create: { state: gettingStarted.state } },
    },
  });
  const productPage = await prisma.page.create({
    data: {
      title: 'Product',
      icon: '📦',
      workspaceId: workspace.id,
      order: 2,
      createdById: alice.id,
      document: { create: { state: product.state } },
    },
  });
  const roadmapPage = await prisma.page.create({
    data: {
      title: 'Roadmap',
      icon: '🗺️',
      workspaceId: workspace.id,
      parentId: productPage.id,
      order: 1,
      createdById: bob.id,
      document: { create: { state: roadmap.state } },
    },
  });
  await prisma.page.create({
    data: {
      title: 'Meeting Notes',
      icon: '📝',
      workspaceId: workspace.id,
      order: 3,
      createdById: carol.id,
      document: { create: { state: notes.state } },
    },
  });

  await prisma.pageFavorite.createMany({
    data: [
      { pageId: root.id, userId: alice.id },
      { pageId: root.id, userId: bob.id },
    ],
    skipDuplicates: true,
  });

  const thread = await prisma.commentThread.create({
    data: {
      pageId: root.id,
      createdById: bob.id,
      comments: {
        create: {
          authorId: bob.id,
          body: 'Welcome @alice — should we mention the slash menu here?',
          mentions: ['alice'],
          quote: 'Try it out',
        },
      },
    },
  });
  await prisma.comment.create({
    data: {
      threadId: thread.id,
      authorId: alice.id,
      body: 'Good idea — done in the next revision.',
      mentions: [],
    },
  });

  await prisma.version.create({
    data: {
      pageId: root.id,
      label: 'Initial draft',
      snapshot: gettingStarted.state,
      type: VersionType.MANUAL,
      byteSize: gettingStarted.state.length,
      createdById: alice.id,
    },
  });

  console.log('[seed] done');
  console.log('[seed] users: alice@demo.dev, bob@demo.dev, carol@demo.dev (password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, parseBody, requireUser } from '@/lib/api-helpers';

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const GET = handle(async () => {
  const user = await requireUser();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { pages: { where: { isDeleted: false } }, members: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return {
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      createdAt: m.workspace.createdAt,
      role: m.role,
      pageCount: m.workspace._count.pages,
      memberCount: m.workspace._count.members,
    })),
  };
});

export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser();
  const { name } = await parseBody(req, createSchema);

  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const slug = `${base || 'workspace'}-${Math.random().toString(36).slice(2, 8)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      members: { create: { userId: user.id, role: 'OWNER' } },
      pages: {
        create: {
          title: 'Getting Started',
          icon: '👋',
          order: 1,
          createdById: user.id,
          document: { create: { state: Buffer.from([0, 0]) } },
        },
      },
    },
    select: { id: true, name: true, slug: true },
  });

  return { workspace };
});

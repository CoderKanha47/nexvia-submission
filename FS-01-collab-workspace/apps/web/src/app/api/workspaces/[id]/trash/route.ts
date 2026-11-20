import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, requireWorkspaceRole } from '@/lib/api-helpers';

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  await requireWorkspaceRole(params.id!, 'VIEW');
  const pages = await prisma.page.findMany({
    where: { workspaceId: params.id, isDeleted: true },
    select: {
      id: true,
      title: true,
      icon: true,
      deletedAt: true,
      updatedAt: true,
    },
    orderBy: { deletedAt: 'desc' },
  });
  return { pages };
});

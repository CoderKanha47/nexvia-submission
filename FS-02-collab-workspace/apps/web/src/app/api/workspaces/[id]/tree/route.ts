import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, requireWorkspaceRole } from '@/lib/api-helpers';

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId } = await requireWorkspaceRole(params.id!, 'VIEW');
  const [pages, favorites] = await Promise.all([
    prisma.page.findMany({
      where: { workspaceId: params.id, isDeleted: false },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
        order: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.pageFavorite.findMany({
      where: { userId, page: { workspaceId: params.id, isDeleted: false } },
      select: { pageId: true },
    }),
  ]);
  const favoriteIds = new Set(favorites.map((f) => f.pageId));
  return {
    pages: pages.map((p) => ({ ...p, favorite: favoriteIds.has(p.id) })),
  };
});

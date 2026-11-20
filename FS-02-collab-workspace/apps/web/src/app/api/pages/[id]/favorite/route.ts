import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, requirePageRole } from '@/lib/api-helpers';

export const POST = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId, page } = await requirePageRole(params.id!, 'VIEW');
  const existing = await prisma.pageFavorite.findUnique({
    where: { pageId_userId: { pageId: page.id, userId } },
  });
  if (existing) {
    await prisma.pageFavorite.delete({ where: { id: existing.id } });
    return { favorite: false };
  }
  await prisma.pageFavorite.create({ data: { pageId: page.id, userId } });
  return { favorite: true };
});

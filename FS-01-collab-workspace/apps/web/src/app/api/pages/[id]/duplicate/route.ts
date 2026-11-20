import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, requirePageRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

export const POST = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId, page } = await requirePageRole(params.id!, 'EDIT');

  const original = await prisma.page.findUniqueOrThrow({
    where: { id: page.id },
    include: { document: true },
  });

  const maxOrder = await prisma.page.aggregate({
    where: { workspaceId: original.workspaceId, parentId: original.parentId, isDeleted: false },
    _max: { order: true },
  });

  const copy = await prisma.page.create({
    data: {
      title: `${original.title} (copy)`,
      icon: original.icon,
      workspaceId: original.workspaceId,
      parentId: original.parentId,
      order: (maxOrder._max.order ?? 0) + 1,
      createdById: userId,
      document: original.document
        ? { create: { state: original.document.state, epoch: 1 } }
        : undefined,
    },
    select: { id: true, title: true, icon: true, parentId: true, order: true },
  });

  await publishBus({
    type: 'page:changed',
    workspaceId: original.workspaceId,
    pageId: copy.id,
    action: 'duplicate',
  });

  return { page: copy };
});

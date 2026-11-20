import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, requirePageRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

/** Restore a soft-deleted page from the trash. */
export const POST = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { page } = await requirePageRole(params.id!, 'EDIT');
  const target = await prisma.page.findUnique({ where: { id: page.id } });
  if (!target) throw new ApiError(404, 'Page not found');
  if (!target.isDeleted) return { page: target, restored: false };

  // If the parent is deleted, restore to root.
  let parentId = target.parentId;
  if (parentId) {
    const parent = await prisma.page.findUnique({ where: { id: parentId } });
    if (!parent || parent.isDeleted) parentId = null;
  }

  const restored = await prisma.page.update({
    where: { id: target.id },
    data: { isDeleted: false, deletedAt: null, parentId },
    select: { id: true, title: true, parentId: true },
  });

  await publishBus({
    type: 'page:changed',
    workspaceId: target.workspaceId,
    pageId: target.id,
    action: 'restore',
  });

  return { page: restored, restored: true };
});

/** Permanently delete (purge) a soft-deleted page. */
export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { page } = await requirePageRole(params.id!, 'EDIT');
  const target = await prisma.page.findUnique({ where: { id: page.id } });
  if (!target) throw new ApiError(404, 'Page not found');
  if (!target.isDeleted) throw new ApiError(400, 'Only deleted pages can be purged.');
  await prisma.page.delete({ where: { id: target.id } });
  await publishBus({
    type: 'page:changed',
    workspaceId: target.workspaceId,
    pageId: target.id,
    action: 'purge',
  });
  return { ok: true };
});

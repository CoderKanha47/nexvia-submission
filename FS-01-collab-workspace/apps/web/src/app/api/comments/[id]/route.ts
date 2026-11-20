import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, requirePageRole, requireUser } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';
import { canManageWorkspace, type Role } from '@nexvia/shared';

export const dynamic = 'force-dynamic';

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const commentId = ctx.params['id'];
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      thread: { select: { pageId: true } },
    },
  });
  if (!comment) throw new ApiError(404, 'Comment not found');

  const user = await requireUser();
  const { role } = await requirePageRole(comment.thread.pageId, 'VIEW');

  const isAuthor = comment.authorId === user.id;
  if (!isAuthor && !canManageWorkspace(role as Role)) {
    throw new ApiError(403, 'You can only delete your own comments.');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true, body: '', mentions: [] },
  });

  await publishBus({ type: 'comment:changed', pageId: comment.thread.pageId });

  return { ok: true };
});

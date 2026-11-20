import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requirePageRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

export const dynamic = 'force-dynamic';

const replySchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).max(50).optional(),
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const threadId = ctx.params['id'];
  const thread = await prisma.commentThread.findUnique({
    where: { id: threadId },
    select: { id: true, pageId: true },
  });
  if (!thread) throw new ApiError(404, 'Thread not found');

  const { userId } = await requirePageRole(thread.pageId, 'COMMENT');
  const input = await parseBody(req, replySchema);

  const comment = await prisma.comment.create({
    data: {
      threadId,
      authorId: userId,
      body: input.body,
      mentions: input.mentions ?? [],
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  await publishBus({ type: 'comment:changed', pageId: thread.pageId });

  return { comment: { ...comment } };
});

const patchSchema = z.object({ resolved: z.boolean() });

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const threadId = ctx.params['id'];
  const thread = await prisma.commentThread.findUnique({
    where: { id: threadId },
    select: { id: true, pageId: true },
  });
  if (!thread) throw new ApiError(404, 'Thread not found');

  const { userId } = await requirePageRole(thread.pageId, 'COMMENT');
  const { resolved } = await parseBody(req, patchSchema);

  await prisma.commentThread.update({
    where: { id: threadId },
    data: {
      resolved,
      resolvedById: resolved ? userId : null,
      resolvedAt: resolved ? new Date() : null,
    },
  });

  await publishBus({ type: 'comment:changed', pageId: thread.pageId });

  return { ok: true, resolved };
});

import { z } from 'zod';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, parseBody, requirePageRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

export const dynamic = 'force-dynamic';

const createThreadSchema = z.object({
  body: z.string().min(1).max(5000),
  quote: z.string().max(2000).optional(),
  mentions: z.array(z.string()).max(50).optional(),
});

export const GET = handle(async (req: NextRequest, ctx) => {
  const pageId = ctx.params['id'];
  await requirePageRole(pageId, 'VIEW');
  const includeResolved =
    new URL(req.url).searchParams.get('includeResolved') === 'true';

  const threads = await prisma.commentThread.findMany({
    where: { pageId, ...(includeResolved ? {} : { resolved: false }) },
    orderBy: { createdAt: 'asc' },
    include: {
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
      },
      resolvedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return {
    threads: threads.map((t) => ({
      id: t.id,
      resolved: t.resolved,
      resolvedAt: t.resolvedAt,
      resolvedBy: t.resolvedBy,
      createdAt: t.createdAt,
      comments: t.comments.map((c) => ({
        id: c.id,
        body: c.body,
        mentions: c.mentions,
        quote: c.quote,
        createdAt: c.createdAt,
        author: c.author,
      })),
    })),
  };
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const pageId = ctx.params['id'];
  const { userId } = await requirePageRole(pageId, 'COMMENT');
  const input = await parseBody(req, createThreadSchema);

  const thread = await prisma.commentThread.create({
    data: {
      pageId,
      createdById: userId,
      comments: {
        create: {
          authorId: userId,
          body: input.body,
          quote: input.quote ?? null,
          mentions: input.mentions ?? [],
        },
      },
    },
    include: {
      comments: {
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  await publishBus({ type: 'comment:changed', pageId });

  return {
    thread: {
      id: thread.id,
      resolved: thread.resolved,
      createdAt: thread.createdAt,
      comments: thread.comments.map((c) => ({
        id: c.id,
        body: c.body,
        mentions: c.mentions,
        quote: c.quote,
        createdAt: c.createdAt,
        author: c.author,
      })),
    },
  };
});

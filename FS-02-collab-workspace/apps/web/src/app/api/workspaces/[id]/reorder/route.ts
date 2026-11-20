import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        parentId: z.string().nullable(),
        order: z.number(),
      }),
    )
    .min(1)
    .max(200),
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  await requireWorkspaceRole(params.id!, 'EDIT');
  const { items } = await parseBody(req, schema);

  const pages = await prisma.page.findMany({
    where: { workspaceId: params.id, id: { in: items.map((i) => i.id) } },
    select: { id: true },
  });
  const valid = new Set(pages.map((p) => p.id));

  await prisma.$transaction(
    items
      .filter((i) => valid.has(i.id))
      .map((i) =>
        prisma.page.update({
          where: { id: i.id },
          data: { parentId: i.parentId, order: i.order },
        }),
      ),
  );

  await publishBus({
    type: 'page:changed',
    workspaceId: params.id,
    pageId: items[0]!.id,
    action: 'reorder',
  });

  return { ok: true, updated: items.length };
});

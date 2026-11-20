import { NextRequest } from 'next/server';
import * as Y from 'yjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  icon: z.string().max(8).optional(),
  parentId: z.string().nullable().optional(),
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId } = await requireWorkspaceRole(params.id!, 'EDIT');
  const { title, icon, parentId } = await parseBody(req, createSchema);

  if (parentId) {
    const parent = await prisma.page.findFirst({
      where: { id: parentId, workspaceId: params.id, isDeleted: false },
      select: { id: true },
    });
    if (!parent) throw new ApiError(400, 'Parent page not found in this workspace.');
  }

  const maxOrder = await prisma.page.aggregate({
    where: { workspaceId: params.id, parentId: parentId ?? null, isDeleted: false },
    _max: { order: true },
  });

  const doc = new Y.Doc();
  if (title) {
    const frag = doc.getXmlFragment('default');
    const el = new Y.XmlElement('heading');
    el.setAttribute('level', '1');
    const t = new Y.XmlText();
    t.insert(0, title);
    el.insert(0, [t]);
    frag.insert(0, [el]);
  }
  const state = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  const page = await prisma.page.create({
    data: {
      title: title?.trim() || 'Untitled',
      icon,
      workspaceId: params.id,
      parentId: parentId ?? null,
      order: (maxOrder._max.order ?? 0) + 1,
      createdById: userId,
      document: { create: { state } },
    },
    select: { id: true, title: true, icon: true, parentId: true, order: true },
  });

  await publishBus({
    type: 'page:changed',
    workspaceId: params.id,
    pageId: page.id,
    action: 'create',
  });

  return { page };
});

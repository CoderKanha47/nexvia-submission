import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requirePageRole } from '@/lib/api-helpers';
import { publishBus } from '@/lib/bus';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  icon: z.string().max(8).nullable().optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
});

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { role, page } = await requirePageRole(params.id!, 'VIEW');
  const full = await prisma.page.findUniqueOrThrow({
    where: { id: page.id },
    select: {
      id: true,
      title: true,
      icon: true,
      parentId: true,
      order: true,
      workspaceId: true,
      isDeleted: true,
      updatedAt: true,
      document: { select: { epoch: true, stateVersion: true, updatedAt: true } },
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });
  return {
    page: {
      ...full,
      epoch: full.document?.epoch ?? 1,
      stateVersion: full.document?.stateVersion ?? 0,
      role,
    },
  };
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { page } = await requirePageRole(params.id!, 'EDIT');
  const body = await parseBody(req, patchSchema);

  if (body.parentId) {
    if (body.parentId === page.id) throw new ApiError(400, 'A page cannot be its own parent.');
    const parent = await prisma.page.findFirst({
      where: { id: body.parentId, workspaceId: page.workspaceId, isDeleted: false },
      select: { id: true },
    });
    if (!parent) throw new ApiError(400, 'Parent page not found.');
  }

  const updated = await prisma.page.update({
    where: { id: page.id },
    data: {
      title: body.title,
      icon: body.icon === undefined ? undefined : body.icon,
      parentId: body.parentId === undefined ? undefined : body.parentId,
      order: body.order,
    },
    select: { id: true, title: true, icon: true, parentId: true, order: true, updatedAt: true },
  });

  await publishBus({
    type: 'page:changed',
    workspaceId: page.workspaceId,
    pageId: page.id,
    action: 'update',
  });

  return { page: updated };
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { page } = await requirePageRole(params.id!, 'EDIT');
  await prisma.page.update({
    where: { id: page.id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  await publishBus({
    type: 'page:changed',
    workspaceId: page.workspaceId,
    pageId: page.id,
    action: 'delete',
  });
  return { ok: true };
});

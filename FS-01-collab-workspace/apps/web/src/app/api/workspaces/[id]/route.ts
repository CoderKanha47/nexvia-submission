import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { canManageWorkspace } from '@nexvia/shared';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId, role } = await requireWorkspaceRole(params.id!, 'VIEW');
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      members: {
        select: {
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!workspace) throw new ApiError(404, 'Workspace not found');
  return {
    workspace: {
      ...workspace,
      role,
      members: workspace.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    },
    me: { userId, role },
  };
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { role } = await requireWorkspaceRole(params.id!, 'OWNER');
  if (!canManageWorkspace(role)) throw new ApiError(403, 'Only the owner can update the workspace.');
  const { name } = await parseBody(req, patchSchema);
  const workspace = await prisma.workspace.update({
    where: { id: params.id },
    data: name ? { name } : {},
    select: { id: true, name: true },
  });
  return { workspace };
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const { role } = await requireWorkspaceRole(params.id!, 'OWNER');
  if (!canManageWorkspace(role)) throw new ApiError(403, 'Only the owner can delete the workspace.');
  await prisma.workspace.delete({ where: { id: params.id } });
  return { ok: true };
});

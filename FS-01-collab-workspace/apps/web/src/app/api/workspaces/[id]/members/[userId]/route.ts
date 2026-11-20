import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { canManageMembers } from '@nexvia/shared';

const patchSchema = z.object({
  role: z.enum(['OWNER', 'EDIT', 'COMMENT', 'VIEW']),
});

export const PATCH = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const workspaceId = params.id!;
  const targetUserId = params.userId!;
  const { userId: actorId, role: actorRole } = await requireWorkspaceRole(workspaceId, 'OWNER');
  if (!canManageMembers(actorRole)) throw new ApiError(403, 'Only the owner can change roles.');

  const { role } = await parseBody(req, patchSchema);

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, 'Member not found');

  if (target.role === 'OWNER' && role !== 'OWNER') {
    const owners = await prisma.workspaceMember.count({
      where: { workspaceId, role: 'OWNER' },
    });
    if (owners <= 1) throw new ApiError(400, 'A workspace must keep at least one owner.');
  }
  if (targetUserId === actorId && role !== 'OWNER' && target.role === 'OWNER') {
    const owners = await prisma.workspaceMember.count({
      where: { workspaceId, role: 'OWNER' },
    });
    if (owners <= 1) throw new ApiError(400, 'You cannot demote yourself as the only owner.');
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role },
  });
  return { ok: true };
});

export const DELETE = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const workspaceId = params.id!;
  const targetUserId = params.userId!;
  const { userId: actorId, role: actorRole } = await requireWorkspaceRole(workspaceId, 'VIEW');

  const isSelf = actorId === targetUserId;
  if (!isSelf && !canManageMembers(actorRole)) {
    throw new ApiError(403, 'Only the owner can remove members.');
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, 'Member not found');
  if (target.role === 'OWNER') {
    const owners = await prisma.workspaceMember.count({ where: { workspaceId, role: 'OWNER' } });
    if (owners <= 1) throw new ApiError(400, 'A workspace must keep at least one owner.');
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
  return { ok: true };
});

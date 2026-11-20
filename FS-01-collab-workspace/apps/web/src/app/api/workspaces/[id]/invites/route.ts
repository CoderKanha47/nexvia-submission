import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { canManageMembers } from '@nexvia/shared';

const createSchema = z.object({
  role: z.enum(['EDIT', 'COMMENT', 'VIEW']).default('EDIT'),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  await requireWorkspaceRole(params.id!, 'VIEW');
  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId: params.id, acceptedAt: null },
    select: {
      token: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return {
    invites: invites.map((i) => ({
      token: i.token,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      createdByName: i.createdBy?.name ?? i.createdBy?.email ?? null,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${i.token}`,
    })),
  };
});

export const POST = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId, role: actorRole } = await requireWorkspaceRole(params.id!, 'VIEW');
  if (!canManageMembers(actorRole)) throw new ApiError(403, 'Only the owner can create invites.');
  const { role, email } = await parseBody(req, createSchema);
  const token = randomBytes(24).toString('base64url');
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: params.id!,
      role,
      email,
      token,
      createdById: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    invite: {
      token: invite.token,
      role: invite.role,
      email: invite.email,
      expiresAt: invite.expiresAt,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invite.token}`,
    },
  };
});

export const DELETE = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { role: actorRole } = await requireWorkspaceRole(params.id!, 'VIEW');
  if (!canManageMembers(actorRole)) throw new ApiError(403, 'Only the owner can revoke invites.');
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) throw new ApiError(400, 'token query param required');
  await prisma.workspaceInvite.updateMany({
    where: { token, workspaceId: params.id, acceptedAt: null },
    data: { expiresAt: new Date(0) },
  });
  return { ok: true };
});

import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, parseBody, requireWorkspaceRole } from '@/lib/api-helpers';
import { canManageMembers } from '@nexvia/shared';

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['EDIT', 'COMMENT', 'VIEW']).default('EDIT'),
});

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  await requireWorkspaceRole(params.id!, 'VIEW');
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: params.id },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return {
    members: members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  };
});

/** Invite a member by email. Existing users are added immediately; others get an invite link. */
export const POST = handle(async (req: NextRequest, ctx) => {
  const { params } = ctx;
  const { userId: actorId, role: actorRole } = await requireWorkspaceRole(params.id!, 'VIEW');
  if (!canManageMembers(actorRole)) throw new ApiError(403, 'Only the owner can invite members.');

  const { email, role } = await parseBody(req, inviteSchema);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const already = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: params.id!, userId: existingUser.id } },
    });
    if (already) throw new ApiError(409, 'This person is already a member.');
    await prisma.workspaceMember.create({
      data: { workspaceId: params.id!, userId: existingUser.id, role },
    });
    return { added: true };
  }

  const token = randomBytes(24).toString('base64url');
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: params.id!,
      email,
      role,
      token,
      createdById: actorId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { token: true, email: true, role: true, expiresAt: true },
  });
  return {
    added: false,
    invite,
    acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invite.token}`,
  };
});

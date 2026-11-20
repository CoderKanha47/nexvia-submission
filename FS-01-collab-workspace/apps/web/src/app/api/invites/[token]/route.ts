import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError, handle, requireUser } from '@/lib/api-helpers';

export const GET = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const user = await requireUser();
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: params.token },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!invite) throw new ApiError(404, 'Invite not found');
  if (invite.acceptedAt) throw new ApiError(410, 'This invite has already been used.');
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new ApiError(410, 'This invite has expired.');
  }
  if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(403, `This invite is for ${invite.email}. You are signed in as ${user.email}.`);
  }
  return {
    invite: {
      token: invite.token,
      role: invite.role,
      workspace: invite.workspace,
    },
  };
});

export const POST = handle(async (_req: NextRequest, ctx) => {
  const { params } = ctx;
  const user = await requireUser();
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: params.token },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!invite) throw new ApiError(404, 'Invite not found');
  if (invite.acceptedAt) throw new ApiError(410, 'This invite has already been used.');
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new ApiError(410, 'This invite has expired.');
  }
  if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ApiError(403, `This invite is for ${invite.email}.`);
  }

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
    update: {},
    create: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
  });
  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedById: user.id },
  });
  return { workspace: invite.workspace };
});

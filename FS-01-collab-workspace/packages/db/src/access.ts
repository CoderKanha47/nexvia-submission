import { prisma } from './index';
import { mergeRoles, type Role } from '@nexvia/shared';

export interface PageAccess {
  pageId: string;
  workspaceId: string;
  role: Role;
  epoch: number;
  isDeleted: boolean;
}

/**
 * Resolve the effective role a user has on a page: strongest of workspace
 * membership and active (non-revoked, non-expired) share links.
 * Returns null when the user has no access at all.
 */
export async function resolvePageAccessForUser(
  userId: string,
  pageId: string,
): Promise<PageAccess | null> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      workspaceId: true,
      isDeleted: true,
      document: { select: { epoch: true } },
      shareLinks: {
        where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { role: true },
      },
    },
  });
  if (!page) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: page.workspaceId, userId } },
    select: { role: true },
  });

  const shareRole = page.shareLinks[0]?.role ?? null;
  const role = mergeRoles(membership?.role ?? null, shareRole);
  if (!role) return null;

  return {
    pageId: page.id,
    workspaceId: page.workspaceId,
    role,
    epoch: page.document?.epoch ?? 1,
    isDeleted: page.isDeleted,
  };
}

/** Resolve a share-link token to (page, role). Returns null when invalid. */
export async function resolveShareToken(
  token: string,
): Promise<{ pageId: string; workspaceId: string; role: Role; epoch: number } | null> {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      role: true,
      revokedAt: true,
      expiresAt: true,
      page: {
        select: {
          id: true,
          workspaceId: true,
          isDeleted: true,
          document: { select: { epoch: true } },
        },
      },
    },
  });
  if (!link || link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;
  if (link.page.isDeleted) return null;
  return {
    pageId: link.page.id,
    workspaceId: link.page.workspaceId,
    role: link.role,
    epoch: link.page.document?.epoch ?? 1,
  };
}

export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<Role | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

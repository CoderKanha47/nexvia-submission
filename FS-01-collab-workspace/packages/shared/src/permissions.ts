export type Role = 'OWNER' | 'EDIT' | 'COMMENT' | 'VIEW';

export const ROLES: Role[] = ['OWNER', 'EDIT', 'COMMENT', 'VIEW'];

export const ROLE_RANK: Record<Role, number> = {
  OWNER: 40,
  EDIT: 30,
  COMMENT: 20,
  VIEW: 10,
};

export function atLeast(role: Role | null | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function canView(role: Role | null | undefined): boolean {
  return atLeast(role, 'VIEW');
}

export function canComment(role: Role | null | undefined): boolean {
  return atLeast(role, 'COMMENT');
}

export function canEdit(role: Role | null | undefined): boolean {
  return atLeast(role, 'EDIT');
}

export function canManageWorkspace(role: Role | null | undefined): boolean {
  return role === 'OWNER';
}

export function canManageMembers(role: Role | null | undefined): boolean {
  return role === 'OWNER';
}

export function canSharePage(role: Role | null | undefined): boolean {
  return canEdit(role);
}

/**
 * Effective role = strongest of workspace membership and page share link.
 * Used by the sync server and API routes.
 */
export function mergeRoles(...roles: Array<Role | null | undefined>): Role | null {
  let best: Role | null = null;
  for (const role of roles) {
    if (!role) continue;
    if (!best || ROLE_RANK[role] > ROLE_RANK[best]) best = role;
  }
  return best;
}

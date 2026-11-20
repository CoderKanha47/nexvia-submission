export interface UserDTO {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  pageCount: number;
  memberCount: number;
  createdAt: string;
}

export interface MemberDTO {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'OWNER' | 'EDIT' | 'COMMENT' | 'VIEW';
  joinedAt: string;
}

export interface InviteDTO {
  token: string;
  email: string | null;
  role: string;
  expiresAt: string | null;
  createdAt: string;
  createdByName: string | null;
  acceptUrl: string;
}

export interface PageNode {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  updatedAt: string;
  createdAt?: string;
  favorite?: boolean;
}

export interface PageDTO extends PageNode {
  workspaceId: string;
  isDeleted: boolean;
  epoch: number;
  stateVersion: number;
  role: 'OWNER' | 'EDIT' | 'COMMENT' | 'VIEW';
  workspace: { id: string; name: string; slug: string };
}

export interface TrashItem {
  id: string;
  title: string;
  icon: string | null;
  deletedAt: string | null;
  updatedAt: string;
}

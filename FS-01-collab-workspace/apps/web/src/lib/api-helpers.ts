import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, rateLimit } from './rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { atLeast, type Role } from '@nexvia/shared';

export { ApiError, rateLimit };

export async function requireUser(): Promise<{ id: string; name: string | null; email: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ApiError(401, 'Unauthorized');
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? '',
  };
}

export async function requireWorkspaceRole(
  workspaceId: string,
  min: Role,
): Promise<{ userId: string; role: Role }> {
  const user = await requireUser();
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { role: true },
  });
  if (!member || !atLeast(member.role as Role, min)) {
    throw new ApiError(403, 'You do not have access to this workspace.');
  }
  return { userId: user.id, role: member.role as Role };
}

export async function requirePageRole(
  pageId: string,
  min: Role,
): Promise<{ userId: string; role: Role; page: { id: string; workspaceId: string; title: string; isDeleted: boolean } }> {
  const user = await requireUser();
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      isDeleted: true,
      document: { select: { epoch: true } },
      workspace: { select: { members: { where: { userId: user.id }, select: { role: true } } } },
      shareLinks: {
        where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!page) throw new ApiError(404, 'Page not found');
  const memberRole = (page.workspace.members[0]?.role as Role | undefined) ?? null;
  const shareRole = (page.shareLinks[0]?.role as Role | undefined) ?? null;
  const role = [memberRole, shareRole].reduce<Role | null>((best, r) => {
    if (!r) return best;
    if (!best) return r;
    const rank: Record<Role, number> = { OWNER: 40, EDIT: 30, COMMENT: 20, VIEW: 10 };
    return rank[r] > rank[best] ? r : best;
  }, null);
  if (!role || !atLeast(role, min)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  return { userId: user.id, role, page };
}

type RouteContext = { params: Record<string, string> };

export function handle<TReturn>(
  fn: (req: NextRequest, ctx: RouteContext) => Promise<TReturn> | TReturn,
) {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    try {
      const data = await fn(req, ctx);
      if (data instanceof NextResponse) return data;
      return NextResponse.json(data ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        const msg = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error('[api] unhandled error', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export async function parseBody<T>(
  req: NextRequest,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
  return schema.parse(raw);
}

import { resolvePageAccessForUser, type PageAccess } from '@nexvia/db';
import { PERMISSION_CACHE_TTL_MS, canView } from '@nexvia/shared';

interface Entry {
  value: PageAccess | null;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

export async function getPageAccessCached(userId: string, pageId: string): Promise<PageAccess | null> {
  const key = `${userId}:${pageId}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await resolvePageAccessForUser(userId, pageId).catch(() => null);
  cache.set(key, { value, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS });
  return value;
}

export function invalidateAccess(pageId: string, userId?: string): void {
  for (const key of cache.keys()) {
    const [u, p] = key.split(':');
    if (p === pageId && (!userId || u === userId)) cache.delete(key);
  }
}

export { canView };

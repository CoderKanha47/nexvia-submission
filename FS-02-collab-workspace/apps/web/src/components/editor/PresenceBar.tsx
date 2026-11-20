'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import { Avatar } from '@/components/ui/avatar';

export interface PresenceEntry {
  clientId: number;
  name: string;
  color: string;
  image?: string;
}

function readPresence(awareness: Awareness, currentClientId: number): PresenceEntry[] {
  const entries: PresenceEntry[] = [];
  for (const [clientId, state] of awareness.getStates()) {
    if (clientId === currentClientId) continue;
    const user = (state as { user?: { name?: string; color?: string; avatar?: string } }).user;
    if (!user) continue;
    entries.push({
      clientId,
      name: user.name ?? 'Guest',
      color: user.color ?? '#666',
      image: user.avatar,
    });
  }
  return entries;
}

export function PresenceBar({
  awareness,
  followingClientId,
  onFollow,
}: {
  awareness: Awareness;
  followingClientId: number | null;
  onFollow: (clientId: number) => void;
}) {
  const [users, setUsers] = useState<PresenceEntry[]>(() => readPresence(awareness, awareness.clientID));

  useEffect(() => {
    const update = (): void => setUsers(readPresence(awareness, awareness.clientID));
    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness]);

  const visible = useMemo(() => users.slice(0, 5), [users]);
  const overflow = users.length - visible.length;

  if (users.length === 0) return null;

  return (
    <div
      className="flex items-center -space-x-1.5"
      aria-label={`${users.length} collaborator${users.length === 1 ? '' : 's'} on this page`}
    >
      {visible.map((user) => {
        const following = followingClientId === user.clientId;
        return (
          <button
            key={user.clientId}
            type="button"
            title={following ? `Following ${user.name} (Esc to stop)` : `Follow ${user.name}`}
            aria-label={following ? `Unfollow ${user.name}` : `Follow ${user.name}`}
            aria-pressed={following}
            onClick={() => onFollow(user.clientId)}
            className={`relative rounded-full transition-transform hover:z-10 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              following ? 'z-10 scale-110' : ''
            }`}
            style={{ boxShadow: `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${user.color}` }}
          >
            <Avatar name={user.name} image={user.image} size="sm" />
          </button>
        );
      })}
      {overflow > 0 ? (
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

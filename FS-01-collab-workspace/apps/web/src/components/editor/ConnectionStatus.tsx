'use client';

import { motion } from 'framer-motion';
import type { CollabStatus } from '@/lib/collab';

const CONFIG: Record<CollabStatus, { label: string; dot: string; pulse: boolean }> = {
  connected: { label: 'Connected', dot: 'bg-success', pulse: false },
  syncing: { label: 'Syncing', dot: 'bg-warning', pulse: true },
  connecting: { label: 'Connecting', dot: 'bg-warning', pulse: true },
  offline: { label: 'Offline — changes saved locally', dot: 'bg-danger', pulse: false },
};

export function ConnectionStatus({ status }: { status: CollabStatus }) {
  const cfg = CONFIG[status];
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-status"
      data-status={status}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
      title={cfg.label}
    >
      <span className="relative flex h-2 w-2">
        {cfg.pulse ? (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      <span className="hidden sm:inline">{cfg.label}</span>
    </div>
  );
}

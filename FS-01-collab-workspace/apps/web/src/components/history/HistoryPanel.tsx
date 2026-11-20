'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Loader2, RotateCcw, Save, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

export const OPEN_HISTORY_EVENT = 'nexvia:open-history';

interface VersionDTO {
  id: string;
  label: string | null;
  type: 'AUTO' | 'MANUAL' | 'RESTORE';
  byteSize: number;
  checksum: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string } | null;
}

const TYPE_BADGE: Record<VersionDTO['type'], { label: string; cls: string }> = {
  AUTO: { label: 'Auto', cls: 'bg-muted text-muted-foreground' },
  MANUAL: { label: 'Saved', cls: 'bg-accent/15 text-accent' },
  RESTORE: { label: 'Pre-restore', cls: 'bg-warning/15 text-warning' },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function HistoryPanel({
  pageId,
  canEditPage,
  open,
  onClose,
  onRestored,
}: {
  pageId: string;
  canEditPage: boolean;
  open: boolean;
  onClose: () => void;
  onRestored: (epoch: number) => void;
}) {
  const toast = useToast();
  const [versions, setVersions] = useState<VersionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ versions: VersionDTO[] }>(`/api/pages/${pageId}/versions`);
      setVersions(data.versions);
    } catch {
      toast({ title: 'Could not load version history', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pageId, toast]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const saveVersion = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await api.post<{ duplicate: boolean; versionId: string }>(
        `/api/pages/${pageId}/versions`,
        label.trim() ? { label: label.trim() } : {},
      );
      if (res.duplicate) {
        toast({ title: 'No changes since the last version — nothing saved.' });
      } else {
        toast({ title: 'Version saved' });
        setLabel('');
        await refresh();
      }
    } catch {
      toast({ title: 'Could not save version', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const restore = async (version: VersionDTO): Promise<void> => {
    setRestoringId(version.id);
    try {
      const res = await api.post<{ epoch: number }>(`/api/versions/${version.id}/restore`, {});
      setConfirmId(null);
      toast({ title: `Restored${version.label ? ` “${version.label}”` : ' version'}` });
      onRestored(res.epoch);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not restore version';
      toast({ title: message, variant: 'error' });
      setConfirmId(null);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ x: 340 }}
          animate={{ x: 0 }}
          exit={{ x: 340 }}
          transition={{ type: 'tween', duration: 0.2, ease: [0.21, 0.6, 0.35, 1] }}
          className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-border bg-surface shadow-xl"
          aria-label="Version history"
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Version history</h2>
            </div>
            <button
              type="button"
              aria-label="Close version history"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {canEditPage ? (
            <div className="shrink-0 space-y-1.5 border-b border-border p-3">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving) void saveVersion();
                }}
                placeholder="Label (optional)"
                maxLength={120}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/50"
              />
              <Button size="sm" className="w-full" loading={saving} onClick={() => void saveVersion()}>
                <Save className="h-3.5 w-3.5" /> Save current version
              </Button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No versions yet</p>
            ) : (
              versions.map((v) => {
                const badge = TYPE_BADGE[v.type];
                const confirming = confirmId === v.id;
                return (
                  <article
                    key={v.id}
                    className="rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {v.label ?? `${badge.label} version`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {timeAgo(v.createdAt)} · {formatBytes(v.byteSize)} ·{' '}
                          {v.createdBy?.name ?? v.createdBy?.email ?? 'sync server'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {canEditPage ? (
                      <div className="mt-2">
                        {confirming ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="mr-auto text-xs text-muted-foreground">
                              Replace the current document?
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              loading={restoringId === v.id}
                              onClick={() => void restore(v)}
                            >
                              Restore
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full"
                            onClick={() => setConfirmId(v.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore this version
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

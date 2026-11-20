'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FilePlus2, Hash, Loader2, Users } from 'lucide-react';
import { useWorkspace } from '@/components/shell/workspace-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { workspaces, loading, createWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && workspaces.length === 1) {
      router.replace(`/w/${workspaces[0]!.id}`);
    }
  }, [loading, workspaces, router]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a workspace or create a new one.
        </p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workspaces…
          </div>
        ) : workspaces.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<Hash className="h-10 w-10" />}
              title="No workspaces yet"
              description="A workspace is a shared home for pages, comments and permissions."
              action={
                <Button onClick={() => setOpen(true)}>
                  <FilePlus2 className="h-4 w-4" />
                  Create your first workspace
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => router.push(`/w/${w.id}`)}
                className="group rounded-xl border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
                    {w.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.pageCount} pages · {w.memberCount} members · {w.role}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Users className="h-4 w-4" />
              New workspace
            </button>
          </div>
        )}
      </motion.div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create workspace"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating}
              onClick={async () => {
                if (!name.trim()) return;
                setCreating(true);
                try {
                  const ws = await createWorkspace(name.trim());
                  router.push(`/w/${ws.id}`);
                } catch {
                  toast({ title: 'Could not create workspace', variant: 'error' });
                } finally {
                  setCreating(false);
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <Input label="Workspace name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Dialog>
    </div>
  );
}

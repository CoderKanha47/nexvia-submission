'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FilePlus2, Clock, Star } from 'lucide-react';
import { useWorkspace } from '@/components/shell/workspace-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

export default function WorkspaceHomePage({ params }: { params: { workspaceId: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { currentWorkspace, tree, loading, createPage } = useWorkspace();

  const favorites = tree.filter((p) => p.favorite);
  const recent = [...tree].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);

  async function newPage() {
    try {
      const page = await createPage({});
      if (page) router.push(`/w/${params.workspaceId}/p/${page.id}`);
    } catch {
      toast({ title: 'Could not create page', variant: 'error' });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {currentWorkspace?.name ?? 'Workspace'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tree.length} pages · jump back in or start something new.
            </p>
          </div>
          <Button onClick={newPage}>
            <FilePlus2 className="h-4 w-4" />
            New page
          </Button>
        </div>

        {loading ? (
          <div className="mt-8 h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" />
        ) : tree.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<FilePlus2 className="h-10 w-10" />}
              title="No pages yet"
              description="Create your first page and start writing together with your team."
              action={<Button onClick={newPage}>Create page</Button>}
            />
          </div>
        ) : (
          <>
            {favorites.length > 0 ? (
              <section className="mt-8">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> Favorites
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {favorites.map((p) => (
                    <PageCard key={p.id} icon={p.icon} title={p.title} onClick={() => router.push(`/w/${params.workspaceId}/p/${p.id}`)} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Recent
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {recent.map((p) => (
                  <PageCard key={p.id} icon={p.icon} title={p.title} onClick={() => router.push(`/w/${params.workspaceId}/p/${p.id}`)} />
                ))}
              </div>
            </section>
          </>
        )}
      </motion.div>
    </div>
  );
}

function PageCard({
  icon,
  title,
  onClick,
}: {
  icon: string | null;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="text-lg">{icon ?? '📄'}</span>
      <span className="truncate text-sm font-medium text-foreground">{title || 'Untitled'}</span>
    </button>
  );
}

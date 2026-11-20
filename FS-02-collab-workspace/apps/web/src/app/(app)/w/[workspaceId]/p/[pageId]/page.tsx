'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Loader2, MessageSquare, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api, ApiClientError } from '@/lib/api-client';
import { getWsToken, type CollabStatus } from '@/lib/collab';
import type { PageDTO } from '@/lib/types';
import { canComment, canEdit } from '@nexvia/shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { CollabEditor } from '@/components/editor/CollabEditor';
import { ConnectionStatus } from '@/components/editor/ConnectionStatus';
import { ADD_COMMENT_EVENT, CommentsPanel } from '@/components/comments/CommentsPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';

export default function PageEditorRoute({
  params,
}: {
  params: { workspaceId: string; pageId: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const [page, setPage] = useState<PageDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [wsToken, setWsToken] = useState<string | null>(null);
  const [status, setStatus] = useState<CollabStatus>('connecting');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingQuote, setPendingQuote] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refetchPage = useCallback(async () => {
    try {
      const data = await api.get<{ page: PageDTO }>(`/api/pages/${params.pageId}`);
      setPage(data.page);
      setTitle(data.page.title);
    } catch {
      /* keep current view */
    }
  }, [params.pageId]);

  useEffect(() => {
    const onAddComment = (e: Event): void => {
      const quote = (e as CustomEvent<string>).detail;
      setPendingQuote(quote);
      setCommentsOpen(true);
    };
    window.addEventListener(ADD_COMMENT_EVENT, onAddComment as EventListener);
    return () => window.removeEventListener(ADD_COMMENT_EVENT, onAddComment as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ page: PageDTO }>(`/api/pages/${params.pageId}`);
        if (cancelled) return;
        setPage(data.page);
        setTitle(data.page.title);
        const token = await getWsToken();
        if (!cancelled) setWsToken(token);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.status === 404 || err.status === 403)) {
          setError(err.status === 404 ? 'Page not found' : 'You do not have access to this page.');
        } else {
          setError('Failed to load page.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.pageId]);

  const saveTitle = useCallback(async () => {
    if (!page || title === page.title || !title.trim()) return;
    setSavingTitle(true);
    try {
      await api.patch(`/api/pages/${page.id}`, { title: title.trim() });
      setPage({ ...page, title: title.trim() });
    } catch {
      toast({ title: 'Could not rename page', variant: 'error' });
      setTitle(page.title);
    } finally {
      setSavingTitle(false);
    }
  }, [page, title, toast]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push(`/w/${params.workspaceId}`)}>
            Back to workspace
          </Button>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div
        className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Loading page…
      </div>
    );
  }

  const editable = canEdit(page.role);
  const user = session?.user;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveTitle();
              (e.target as HTMLInputElement).blur();
            }
          }}
          readOnly={!editable}
          className="w-full bg-transparent text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-default"
          placeholder="Untitled"
          aria-label="Page title"
        />
        {savingTitle ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
        <button
          type="button"
          aria-label="Favorite page"
          title={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={async () => {
            await api.post(`/api/pages/${page.id}/favorite`);
            setPage({ ...page, favorite: !page.favorite } as PageDTO);
          }}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Star className={`h-4 w-4 ${page.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
        <button
          type="button"
          aria-label="Toggle comments"
          title={commentsOpen ? 'Hide comments' : 'Show comments'}
          aria-pressed={commentsOpen}
          onClick={() => setCommentsOpen((v) => !v)}
          className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            commentsOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Version history"
          title={historyOpen ? 'Hide version history' : 'Show version history'}
          aria-pressed={historyOpen}
          onClick={() => setHistoryOpen((v) => !v)}
          className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            historyOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
        </button>
        <ConnectionStatus status={status} />
      </div>

      {!editable ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-warning">
          You have {page.role.toLowerCase()} access — editing is disabled
        </p>
      ) : null}

      <div className="mt-6">
        {wsToken && user ? (
          <CollabEditor
            key={`${page.id}:${page.epoch}`}
            pageId={page.id}
            epoch={page.epoch}
            wsToken={wsToken}
            user={{
              id: user.id,
              name: user.name ?? null,
              email: user.email ?? '',
              image: user.image ?? null,
            }}
            editable={editable}
            onStatusChange={setStatus}
            onDocReset={() => {
              toast({ title: 'Document was restored to an earlier version — reloading…' });
              void refetchPage();
            }}
          />
        ) : (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing editor…
          </div>
        )}
      </div>

      {user ? (
        <CommentsPanel
          pageId={page.id}
          workspaceId={params.workspaceId}
          canComment={canComment(page.role)}
          currentUserId={user.id}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          pendingQuote={pendingQuote}
          onPendingQuoteHandled={() => setPendingQuote(null)}
        />
      ) : null}

      <HistoryPanel
        pageId={page.id}
        canEditPage={editable}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestored={(epoch) => {
          setPage({ ...page, epoch } as PageDTO);
          setHistoryOpen(false);
        }}
      />
    </div>
  );
}

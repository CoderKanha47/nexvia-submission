'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, MessageSquarePlus, Send, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { MemberDTO } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { currentMentionQuery, extractMentionIds, insertMention, tokenizeBody } from '@/lib/mentions';

/** Dispatched by the editor bubble toolbar with the selected quote text. */
export const ADD_COMMENT_EVENT = 'nexvia:add-comment';

interface CommentDTO {
  id: string;
  body: string;
  mentions: string[];
  quote: string | null;
  createdAt: string;
  author: { id: string; name: string | null; email: string; image: string | null } | null;
}

interface ThreadDTO {
  id: string;
  resolved: boolean;
  createdAt: string;
  comments: CommentDTO[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CommentBody({ body }: { body: string }) {
  const tokens = useMemo(() => tokenizeBody(body), [body]);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
      {tokens.map((t, i) =>
        t.type === 'mention' ? (
          <span key={i} className="rounded bg-accent/15 px-0.5 font-medium text-accent">
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </p>
  );
}

function MentionInput({
  value,
  onChange,
  members,
  placeholder,
  innerRef,
}: {
  value: string;
  onChange: (v: string) => void;
  members: MemberDTO[];
  placeholder: string;
  innerRef?: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = innerRef ?? localRef;
  const [query, setQuery] = useState<string | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const candidates = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => (m.name ?? m.email).toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 5);
  }, [members, query]);

  const syncQuery = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setQuery(currentMentionQuery(value, el.selectionStart ?? value.length));
    setCandidateIndex(0);
  }, [ref, value]);

  const pick = useCallback(
    (member: MemberDTO) => {
      const el = ref.current;
      const caret = el?.selectionStart ?? value.length;
      const { body, caret: nextCaret } = insertMention(value, caret, member.name ?? member.email, member.userId);
      onChange(body);
      setQuery(null);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [onChange, ref, value],
  );

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          syncQuery();
        }}
        onKeyUp={syncQuery}
        onClick={syncQuery}
        onKeyDown={(e) => {
          if (candidates.length > 0 && query !== null) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCandidateIndex((i) => (i + 1) % candidates.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCandidateIndex((i) => (i - 1 + candidates.length) % candidates.length);
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              const member = candidates[candidateIndex];
              if (member) pick(member);
              return;
            }
            if (e.key === 'Escape') {
              setQuery(null);
              return;
            }
          }
        }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/50"
      />
      <AnimatePresence>
        {query !== null && candidates.length > 0 ? (
          <motion.ul
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-md border border-border bg-background py-1 shadow-lg"
            role="listbox"
          >
            {candidates.map((m, i) => (
              <li key={m.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === candidateIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(m);
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm ${
                    i === candidateIndex ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar name={m.name} email={m.email} image={m.image} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{m.name ?? m.email}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function CommentsPanel({
  pageId,
  workspaceId,
  canComment,
  currentUserId,
  open,
  onClose,
  pendingQuote,
  onPendingQuoteHandled,
}: {
  pageId: string;
  workspaceId: string;
  canComment: boolean;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
  pendingQuote: string | null;
  onPendingQuoteHandled: () => void;
}) {
  const toast = useToast();
  const [threads, setThreads] = useState<ThreadDTO[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [composer, setComposer] = useState('');
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [pendingQuoteLocal, setPendingQuoteLocal] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const quote = pendingQuote ?? pendingQuoteLocal;

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ threads: ThreadDTO[] }>(
        `/api/pages/${pageId}/threads?includeResolved=${showResolved}`,
      );
      setThreads(data.threads);
    } catch {
      /* ignore */
    }
  }, [pageId, showResolved]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    const onFocus = (): void => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [open, refresh]);

  useEffect(() => {
    api
      .get<{ members: MemberDTO[] }>(`/api/workspaces/${workspaceId}/members`)
      .then((d) => setMembers(d.members))
      .catch(() => undefined);
  }, [workspaceId]);

  useEffect(() => {
    if (!pendingQuote) return;
    setPendingQuoteLocal(pendingQuote);
    onPendingQuoteHandled();
    requestAnimationFrame(() => composerRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuote]);

  const postThread = async (): Promise<void> => {
    if (!composer.trim()) return;
    setPosting(true);
    try {
      await api.post(`/api/pages/${pageId}/threads`, {
        body: composer.trim(),
        quote: quote ?? undefined,
        mentions: extractMentionIds(composer),
      });
      setComposer('');
      setPendingQuoteLocal(null);
      onPendingQuoteHandled();
      await refresh();
    } catch {
      toast({ title: 'Could not post comment', variant: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (threadId: string): Promise<void> => {
    if (!replyBody.trim()) return;
    setPosting(true);
    try {
      await api.post(`/api/threads/${threadId}`, {
        body: replyBody.trim(),
        mentions: extractMentionIds(replyBody),
      });
      setReplyBody('');
      setReplyOpen(null);
      await refresh();
    } catch {
      toast({ title: 'Could not post reply', variant: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const toggleResolved = async (thread: ThreadDTO): Promise<void> => {
    try {
      await api.patch(`/api/threads/${thread.id}`, { resolved: !thread.resolved });
      await refresh();
    } catch {
      toast({ title: 'Could not update thread', variant: 'error' });
    }
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    try {
      await api.delete(`/api/comments/${commentId}`);
      await refresh();
    } catch {
      toast({ title: 'Could not delete comment', variant: 'error' });
    }
  };

  const openThreads = threads.filter((t) => !t.resolved || showResolved);

  // Highlight anchored quotes in the editor using the CSS Custom Highlight API.
  useEffect(() => {
    if (!open) return;
    const editorDom = document.querySelector('.ProseMirror');
    const highlights = (CSS as unknown as { highlights?: Map<string, Highlight> }).highlights;
    if (!editorDom || !highlights || typeof Highlight === 'undefined') return;

    const ranges: Range[] = [];
    for (const thread of openThreads) {
      const anchor = thread.comments[0]?.quote;
      if (!anchor) continue;
      const walker = document.createTreeWalker(editorDom, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? '';
        let idx = text.indexOf(anchor);
        while (idx !== -1) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + anchor.length);
          ranges.push(range);
          idx = text.indexOf(anchor, idx + anchor.length);
        }
      }
    }
    if (ranges.length > 0) {
      highlights.set('nexvia-comment', new Highlight(...ranges));
    }
    return () => {
      highlights.delete('nexvia-comment');
    };
  }, [open, openThreads]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ x: 340 }}
          animate={{ x: 0 }}
          exit={{ x: 340 }}
          transition={{ type: 'tween', duration: 0.2, ease: [0.21, 0.6, 0.35, 1] }}
          className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-border bg-surface shadow-xl"
          aria-label="Comments"
        >
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Comments</h2>
              <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                {threads.filter((t) => !t.resolved).length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowResolved((v) => !v)}
                className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showResolved ? 'Hide resolved' : 'Show resolved'}
              </button>
              <button
                type="button"
                aria-label="Close comments"
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {openThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquarePlus className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                {canComment ? (
                  <p className="text-xs text-muted-foreground/70">
                    Select text and press
                    <kbd className="mx-1 rounded border border-border bg-muted px-1 font-mono">C</kbd>
                    or use the toolbar to start a thread.
                  </p>
                ) : null}
              </div>
            ) : (
              openThreads.map((thread) => (
                <article
                  key={thread.id}
                  className={`rounded-lg border border-border bg-background p-2.5 ${
                    thread.resolved ? 'opacity-60' : ''
                  }`}
                >
                  {thread.comments[0]?.quote ? (
                    <p className="mb-2 border-l-2 border-accent/60 pl-2 text-xs italic text-muted-foreground">
                      “{thread.comments[0].quote.slice(0, 160)}
                      {thread.comments[0].quote.length > 160 ? '…' : ''}”
                    </p>
                  ) : null}
                  <div className="space-y-2.5">
                    {thread.comments.map((c) => (
                      <div key={c.id} className="group flex items-start gap-2">
                        <Avatar name={c.author?.name} email={c.author?.email} image={c.author?.image} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">
                            {c.author?.name ?? c.author?.email ?? 'Unknown'}{' '}
                            <span className="font-normal text-muted-foreground">{timeAgo(c.createdAt)}</span>
                          </p>
                          <CommentBody body={c.body} />
                        </div>
                        {c.author?.id === currentUserId ? (
                          <button
                            type="button"
                            aria-label="Delete comment"
                            onClick={() => void deleteComment(c.id)}
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2">
                    {canComment ? (
                      <>
                        {replyOpen === thread.id ? (
                          <div className="flex-1 space-y-1.5">
                            <MentionInput
                              value={replyBody}
                              onChange={setReplyBody}
                              members={members}
                              placeholder="Reply… use @ to mention"
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setReplyOpen(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" loading={posting} onClick={() => void postReply(thread.id)}>
                                <Send className="h-3 w-3" /> Reply
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setReplyOpen(thread.id)}>
                              Reply
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void toggleResolved(thread)}
                              title={thread.resolved ? 'Reopen thread' : 'Resolve thread'}
                            >
                              {thread.resolved ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                              {thread.resolved ? 'Resolved' : 'Resolve'}
                            </Button>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>

          {canComment ? (
            <div className="shrink-0 space-y-1.5 border-t border-border p-3">
              {quote ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-2 py-1">
                  <p className="min-w-0 truncate text-xs italic text-muted-foreground">“{quote}”</p>
                  <button
                    type="button"
                    aria-label="Remove quote"
                    onClick={() => {
                      setPendingQuoteLocal(null);
                      onPendingQuoteHandled();
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <MentionInput
                innerRef={composerRef}
                value={composer}
                onChange={setComposer}
                members={members}
                placeholder="Add a comment… use @ to mention"
              />
              <Button
                size="sm"
                className="w-full"
                loading={posting}
                disabled={!composer.trim()}
                onClick={() => void postThread()}
              >
                <Send className="h-3.5 w-3.5" /> Comment
              </Button>
            </div>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

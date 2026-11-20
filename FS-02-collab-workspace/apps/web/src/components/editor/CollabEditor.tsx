'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { createCollab, type CollabHandle, type CollabStatus } from '@/lib/collab';
import { avatarColorHex } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SlashCommand } from './slash-command';
import { BubbleToolbar } from './BubbleToolbar';
import { PresenceBar } from './PresenceBar';
import { UserRoundX } from 'lucide-react';

export interface EditorUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface CollabEditorProps {
  pageId: string;
  epoch: number;
  wsToken: string;
  user: EditorUser;
  editable: boolean;
  onStatusChange?: (status: CollabStatus) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  onDocReset?: () => void;
}

export function CollabEditor(props: CollabEditorProps) {
  const [handle, setHandle] = useState<CollabHandle | null>(null);

  useEffect(() => {
    const h = createCollab({
      pageId: props.pageId,
      epoch: props.epoch,
      token: props.wsToken,
      onStatus: props.onStatusChange,
      onDocReset: props.onDocReset,
    });
    setHandle(h);
    return () => {
      setHandle(null);
      h.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pageId, props.epoch, props.wsToken]);

  if (!handle) {
    return (
      <div className="flex flex-col gap-3 py-4" aria-busy="true" aria-label="Loading editor">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return <EditorInner {...props} handle={handle} />;
}

function EditorInner({
  user,
  editable,
  handle,
  onEditorReady,
}: CollabEditorProps & { handle: CollabHandle }) {
  const cursorUser = useMemo(
    () => ({
      name: user.name ?? user.email.split('@')[0] ?? 'Guest',
      color: avatarColorHex(user.id || user.email),
      avatar: user.image ?? undefined,
    }),
    [user.id, user.email, user.name, user.image],
  );

  const editor = useEditor(
    {
      editable,
      extensions: [
        StarterKit.configure({
          // Yjs provides undo/redo scoped to this user via UndoManager.
          history: false,
        }),
        Collaboration.configure({
          document: handle.doc,
        }),
        CollaborationCursor.configure({
          // The cursor extension reads provider.awareness in onCreate —
          // without the provider it throws "Cannot read properties of null".
          provider: handle.provider,
          user: cursorUser,
        }),
        Placeholder.configure({
          placeholder: 'Start writing, or press "/" for commands…',
        }),
        Underline,
        Highlight.configure({ multicolor: false }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        }),
        Image.configure({ inline: false, allowBase64: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        SlashCommand,
      ],
      editorProps: {
        attributes: {
          class: 'editor-shell',
          'aria-label': 'Document editor',
          spellcheck: 'true',
        },
      },
    },
    [handle.doc, cursorUser],
  );

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // ---------- Follow mode ----------
  const awareness = handle.provider.awareness;
  const [followingClientId, setFollowingClientId] = useState<number | null>(null);
  const [followingName, setFollowingName] = useState<string | null>(null);

  const stopFollow = useCallback(() => {
    setFollowingClientId(null);
    setFollowingName(null);
  }, []);

  const startFollow = useCallback(
    (clientId: number) => {
      if (followingClientId === clientId) {
        stopFollow();
        return;
      }
      const state = awareness.getStates().get(clientId) as
        | { user?: { name?: string } }
        | undefined;
      if (!state) return;
      setFollowingClientId(clientId);
      setFollowingName(state.user?.name ?? 'collaborator');
    },
    [awareness, followingClientId, stopFollow],
  );

  useEffect(() => {
    if (followingClientId == null || !editor) return;

    const scrollToFollowedCursor = (): void => {
      const state = awareness.getStates().get(followingClientId) as
        | { cursor?: { anchor?: number; head?: number } }
        | undefined;
      if (!state) {
        // The followed user left — stop following.
        setFollowingClientId(null);
        setFollowingName(null);
        return;
      }
      const pos = state.cursor?.anchor ?? state.cursor?.head;
      if (pos == null) return;
      try {
        const coords = editor.view.coordsAtPos(pos);
        const scroller = document.querySelector('main');
        if (!scroller) return;
        const scrollerRect = scroller.getBoundingClientRect();
        const target = scroller.scrollTop + (coords.top - scrollerRect.top) - scroller.clientHeight / 3;
        scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } catch {
        /* position may be out of range during concurrent edits */
      }
    };

    scrollToFollowedCursor();
    awareness.on('change', scrollToFollowedCursor);
    return () => awareness.off('change', scrollToFollowedCursor);
  }, [awareness, editor, followingClientId]);

  useEffect(() => {
    if (followingClientId == null) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') stopFollow();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [followingClientId, stopFollow]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <PresenceBar
          awareness={awareness}
          followingClientId={followingClientId}
          onFollow={startFollow}
        />
        {followingClientId != null ? (
          <button
            type="button"
            onClick={stopFollow}
            className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <UserRoundX className="h-3.5 w-3.5" />
            Following {followingName}
            <kbd className="rounded border border-accent/30 px-1 font-mono text-[10px]">esc</kbd>
          </button>
        ) : null}
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[50vh] focus:outline-none"
        aria-busy={editor ? 'false' : 'true'}
      />
      {editor && editable ? <BubbleToolbar editor={editor} /> : null}
    </div>
  );
}

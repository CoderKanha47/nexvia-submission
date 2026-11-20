'use client';

import { BubbleMenu, type Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  MessageSquarePlus,
  Strikethrough,
  Underline,
  Unlink,
} from 'lucide-react';

function BubbleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const setLink = (): void => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Link URL', previous ?? 'https://');
    if (href === null) return;
    if (href === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href, target: '_blank', rel: 'noopener noreferrer' })
      .run();
  };

  const commentSelection = (): void => {
    const { from, to } = editor.state.selection;
    const quote = editor.state.doc.textBetween(from, to, ' ').trim();
    window.dispatchEvent(new CustomEvent('nexvia:add-comment', { detail: quote }));
  };

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={200}
      tippyOptions={{ offset: [0, 8], placement: 'top' }}
      shouldShow={({ editor: e, from, to }) => e.isEditable && from !== to}
    >
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg"
      >
        <BubbleButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </BubbleButton>
        <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
        <BubbleButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </BubbleButton>
        <BubbleButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" />
        </BubbleButton>
        <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
        {editor.isActive('link') ? (
          <BubbleButton label="Remove link" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}>
            <Unlink className="h-3.5 w-3.5" />
          </BubbleButton>
        ) : (
          <BubbleButton label="Add link" onClick={setLink}>
            <Link2 className="h-3.5 w-3.5" />
          </BubbleButton>
        )}
        <BubbleButton label="Comment on selection" onClick={commentSelection}>
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
}

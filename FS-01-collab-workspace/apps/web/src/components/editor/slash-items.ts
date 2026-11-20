import type { Editor, Range } from '@tiptap/core';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  SquareCode,
  Table,
  type LucideIcon,
} from 'lucide-react';

export interface SlashCommandContext {
  editor: Editor;
  range: Range;
}

export interface SlashItem {
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  command: (ctx: SlashCommandContext) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'title', 'heading'],
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'subtitle', 'heading'],
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading'],
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bullet list',
    description: 'Unordered list',
    keywords: ['ul', 'unordered', 'list', 'bullet'],
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'Ordered list',
    keywords: ['ol', 'ordered', 'list', 'number'],
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'To-do list',
    description: 'Track tasks with checkboxes',
    keywords: ['todo', 'task', 'check', 'checkbox'],
    icon: ListTodo,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Quote',
    description: 'Blockquote',
    keywords: ['blockquote', 'quote', 'citation'],
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code block',
    description: 'Monospaced code snippet',
    keywords: ['code', 'snippet', 'pre', 'monospace'],
    icon: SquareCode,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    keywords: ['hr', 'rule', 'line', 'divider', 'separator'],
    icon: Minus,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3×3 table',
    keywords: ['table', 'grid', 'spreadsheet'],
    icon: Table,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Embed an image from a URL',
    keywords: ['image', 'img', 'picture', 'photo', 'media'],
    icon: ImageIcon,
    command: ({ editor, range }) => {
      const src = window.prompt('Image URL');
      if (!src) return;
      editor.chain().focus().deleteRange(range).setImage({ src }).run();
    },
  },
  {
    title: 'Bold text',
    description: 'Make the selection bold',
    keywords: ['bold', 'strong', 'b'],
    icon: Bold,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('bold').run(),
  },
  {
    title: 'Italic text',
    description: 'Italicize the selection',
    keywords: ['italic', 'em', 'i'],
    icon: Italic,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('italic').run(),
  },
  {
    title: 'Inline code',
    description: 'Monospaced inline snippet',
    keywords: ['code', 'inline', 'mono'],
    icon: Code,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setMark('code').run(),
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q)),
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronRight,
  Copy,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { PageNode } from '@/lib/types';
import { Menu } from '@/components/ui/menu';
import { Skeleton } from '@/components/ui/skeleton';

const STORAGE_KEY = 'nexvia:sidebar-collapsed';

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

interface FlatItem {
  node: PageNode;
  depth: number;
  hasChildren: boolean;
}

function buildTree(pages: PageNode[]) {
  const childrenOf = new Map<string | null, PageNode[]>();
  const ids = new Set(pages.map((p) => p.id));
  for (const p of pages) {
    const key = p.parentId && ids.has(p.parentId) ? p.parentId : null;
    const list = childrenOf.get(key) ?? [];
    list.push(p);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  return childrenOf;
}

function flatten(
  childrenOf: Map<string | null, PageNode[]>,
  collapsed: Set<string>,
  activeId: string | null,
): FlatItem[] {
  const out: FlatItem[] = [];
  const walk = (parentId: string | null, depth: number): void => {
    for (const node of childrenOf.get(parentId) ?? []) {
      const kids = childrenOf.get(node.id) ?? [];
      const hasChildren = kids.length > 0;
      out.push({ node, depth, hasChildren });
      if (hasChildren && !collapsed.has(node.id) && node.id !== activeId) {
        walk(node.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return out;
}

interface SortableRowProps {
  item: FlatItem;
  active: boolean;
  favorite: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onOpenContext: (id: string, x: number, y: number) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

function SortableRow({
  item,
  active,
  collapsed,
  onToggleCollapse,
  onOpenContext,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: SortableRowProps) {
  const { node, depth, hasChildren } = item;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: 8 + depth * 14,
    opacity: isDragging ? 0.5 : 1,
  };

  const renaming = renamingId === node.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1 rounded-md py-1 pr-1 text-sm transition-colors ${
        active ? 'bg-accent/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${isDragging ? 'z-10 bg-surface shadow-md' : ''}`}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenContext(node.id, e.clientX, e.clientY);
      }}
    >
      <button
        type="button"
        aria-label={hasChildren ? (collapsed ? 'Expand' : 'Collapse') : 'Page'}
        aria-expanded={hasChildren ? !collapsed : undefined}
        tabIndex={hasChildren ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggleCollapse(node.id);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          hasChildren ? '' : 'pointer-events-none opacity-0'
        }`}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
        />
      </button>

      {renaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onRenameCommit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={onRenameCommit}
          className="min-w-0 flex-1 rounded border border-accent bg-background px-1 py-0.5 text-sm text-foreground outline-none"
          aria-label="Rename page"
        />
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden py-0.5">
          <span className="shrink-0 text-sm leading-none">
            {node.icon ?? <FileText className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate text-[13px] leading-5">{node.title || 'Untitled'}</span>
          {node.favorite ? (
            <Star className="ml-auto h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
          ) : null}
        </span>
      )}

      <button
        type="button"
        aria-label={`Actions for ${node.title}`}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onOpenContext(node.id, rect.left, rect.bottom + 4);
        }}
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover:flex"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export interface PageTreeProps {
  pages: PageNode[];
  activePageId: string | null;
  loading?: boolean;
  onNavigate: (pageId: string) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => Promise<void>;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onToggleFavorite: (pageId: string) => void;
  onCopyLink: (pageId: string) => void;
  onReorder: (pageId: string, parentId: string | null, order: number) => Promise<void>;
}

export function PageTree({
  pages,
  activePageId,
  loading,
  onNavigate,
  onCreateChild,
  onRename,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onCopyLink,
  onReorder,
}: PageTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!hydrated) {
      setCollapsed(loadCollapsed());
      setHydrated(true);
    }
  }, [hydrated]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const childrenOf = useMemo(() => buildTree(pages), [pages]);
  const items = useMemo(
    () => flatten(childrenOf, collapsed, renamingId),
    [childrenOf, collapsed, renamingId],
  );
  const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const startRename = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    setRenamingId(id);
    setRenameValue(node.title);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const value = renameValue.trim();
    const id = renamingId;
    setRenamingId(null);
    if (value && value !== byId.get(id)?.title) {
      await onRename(id, value);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const flatIds = items.map((i) => i.node.id);
    const from = flatIds.indexOf(String(active.id));
    const to = flatIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const reordered = arrayMove(flatIds, from, to);
    const idx = reordered.indexOf(String(active.id));
    const prevNode = idx > 0 ? byId.get(reordered[idx - 1]!) : null;
    const nextNode = idx < reordered.length - 1 ? byId.get(reordered[idx + 1]!) : null;
    const activeNode = byId.get(String(active.id));
    if (!activeNode) return;

    const isDescendant = (candidate: PageNode | null | undefined, ancestorId: string): boolean => {
      let cur: PageNode | null | undefined = candidate;
      let guard = 0;
      while (cur && guard++ < 50) {
        if (cur.id === ancestorId) return true;
        cur = cur.parentId ? byId.get(cur.parentId) : null;
      }
      return false;
    };
    if (isDescendant(prevNode, activeNode.id) || isDescendant(nextNode, activeNode.id)) return;

    let parentId = prevNode ? prevNode.parentId : (nextNode?.parentId ?? null);
    if (parentId === activeNode.id) parentId = activeNode.parentId;

    let order: number;
    const prevSibling = prevNode && prevNode.parentId === parentId ? prevNode : null;
    const nextSibling = nextNode && nextNode.parentId === parentId ? nextNode : null;
    if (prevSibling && nextSibling) {
      order = (prevSibling.order + nextSibling.order) / 2;
    } else if (prevSibling) {
      order = prevSibling.order + 1;
    } else if (nextSibling) {
      order = nextSibling.order - 1;
    } else {
      order = 1;
    }

    await onReorder(activeNode.id, parentId, order);
  };

  if (loading && pages.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-2" aria-busy="true">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  const contextNode = context ? byId.get(context.id) : null;

  return (
    <div className="flex flex-col gap-0.5" role="tree" aria-label="Pages">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.node.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <div
              key={item.node.id}
              onClick={() => onNavigate(item.node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate(item.node.id);
                }
                if (e.key === 'F2') {
                  e.preventDefault();
                  startRename(item.node.id);
                }
              }}
              role="treeitem"
              aria-selected={activePageId === item.node.id}
              aria-level={item.depth + 1}
              className="contents"
            >
              <SortableRow
                item={item}
                active={activePageId === item.node.id}
                favorite={!!item.node.favorite}
                collapsed={collapsed.has(item.node.id)}
                onToggleCollapse={toggleCollapse}
                onOpenContext={(id, x, y) => setContext({ id, x, y })}
                renamingId={renamingId}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameCommit={commitRename}
                onRenameCancel={() => setRenamingId(null)}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {items.length === 0 && !loading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No pages yet</p>
      ) : null}

      <Menu
        open={!!context}
        onClose={() => setContext(null)}
        position={context ? { x: context.x, y: context.y } : undefined}
        items={
          contextNode
            ? [
                {
                  label: 'Add sub-page',
                  icon: <Plus className="h-3.5 w-3.5" />,
                  onSelect: () => onCreateChild(contextNode.id),
                },
                {
                  label: 'Rename',
                  icon: <Pencil className="h-3.5 w-3.5" />,
                  onSelect: () => startRename(contextNode.id),
                },
                {
                  label: 'Duplicate',
                  icon: <Copy className="h-3.5 w-3.5" />,
                  onSelect: () => onDuplicate(contextNode.id),
                },
                {
                  label: contextNode.favorite ? 'Unpin' : 'Pin to favorites',
                  icon: <Star className="h-3.5 w-3.5" />,
                  onSelect: () => onToggleFavorite(contextNode.id),
                },
                {
                  label: 'Copy link',
                  icon: <Link2 className="h-3.5 w-3.5" />,
                  onSelect: () => onCopyLink(contextNode.id),
                },
                {
                  label: 'Delete',
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  danger: true,
                  separatorBefore: true,
                  onSelect: () => onDelete(contextNode.id),
                },
              ]
            : []
        }
      />
    </div>
  );
}

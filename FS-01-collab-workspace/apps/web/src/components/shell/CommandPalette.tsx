'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FilePlus2,
  Hash,
  Home,
  Moon,
  Search,
  Settings,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';

export const OPEN_COMMAND_PALETTE_EVENT = 'nexvia:open-command-palette';

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group: string;
  run: () => void | Promise<void>;
}

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, tree, createPage } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = (): void => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const actions = useMemo<PaletteAction[]>(() => {
    const wsId = currentWorkspace?.id ?? '';
    const list: PaletteAction[] = [
      {
        id: 'action:new-page',
        label: 'Create new page',
        hint: 'Action',
        icon: FilePlus2,
        group: 'Actions',
        run: async () => {
          const page = await createPage({});
          if (page) router.push(`/w/${wsId}/p/${page.id}`);
        },
      },
      {
        id: 'action:theme',
        label: `Switch theme (current: ${theme ?? 'system'})`,
        hint: 'Action',
        icon: theme === 'dark' ? Sun : Moon,
        group: 'Actions',
        run: () => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'),
      },
      {
        id: 'action:home',
        label: 'Go to workspace home',
        hint: 'Navigation',
        icon: Home,
        group: 'Actions',
        run: () => router.push(`/w/${wsId}`),
      },
      {
        id: 'action:settings',
        label: 'Open settings',
        hint: 'Navigation',
        icon: Settings,
        group: 'Actions',
        run: () => router.push(`/w/${wsId}/settings`),
      },
    ];
    for (const p of tree) {
      list.push({
        id: `page:${p.id}`,
        label: p.title || 'Untitled',
        hint: 'Page',
        icon: p.icon ? ((() => <span>{p.icon}</span>) as unknown as LucideIcon) : Hash,
        group: 'Pages',
        run: () => router.push(`/w/${wsId}/p/${p.id}`),
      });
    }
    return list;
  }, [currentWorkspace, createPage, router, setTheme, theme, tree]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return actions;
    return actions
      .filter((a) => a.label.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts;
      });
  }, [actions, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteAction[]>();
    for (const a of filtered) {
      const arr = map.get(a.group) ?? [];
      arr.push(a);
      map.set(a.group, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  // Flat index mapping for keyboard navigation across groups.
  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  const close = useCallback(() => setOpen(false), []);

  const runAction = useCallback(
    (action: PaletteAction) => {
      close();
      void action.run();
    },
    [close],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = flat[selectedIndex];
      if (action) runAction(action);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filtered.length]);

  useEffect(() => {
    if (selectedIndex >= flat.length) setSelectedIndex(0);
  }, [flat.length, selectedIndex]);

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
          onClick={close}
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.21, 0.6, 0.35, 1] }}
            role="dialog"
            aria-label="Command palette"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Search pages or run a command…"
                aria-label="Command palette input"
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                esc
              </kbd>
            </div>
            <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5" role="listbox">
              {flat.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results</p>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="px-1.5 pb-1">
                    <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </p>
                    {items.map((action) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const Icon = action.icon;
                      const active = index === selectedIndex;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-active={active || undefined}
                          onClick={() => runAction(action)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                            active ? 'bg-muted' : ''
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{action.label}</span>
                          {action.hint ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{action.hint}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

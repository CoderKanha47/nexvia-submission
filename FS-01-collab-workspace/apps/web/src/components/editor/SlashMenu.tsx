'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SlashItem } from './slash-items';

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const selectedIndex = useRef(0);

  useEffect(() => {
    selectedIndex.current = 0;
  }, [items]);

  const selectItem = (index: number): void => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        selectedIndex.current = (selectedIndex.current + items.length - 1) % items.length;
        return true;
      }
      if (event.key === 'ArrowDown') {
        selectedIndex.current = (selectedIndex.current + 1) % items.length;
        return true;
      }
      if (event.key === 'Enter') {
        if (items.length > 0) selectItem(selectedIndex.current);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="slash-menu-styles w-64 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground shadow-lg">
        No results
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Block menu"
      className="slash-menu-styles w-72 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = index === selectedIndex.current;
        return (
          <button
            key={item.title}
            type="button"
            role="option"
            aria-selected={active}
            data-active={active || undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              selectItem(index);
            }}
            onMouseEnter={() => {
              selectedIndex.current = index;
            }}
            className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors ${
              active ? 'bg-muted' : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  separatorBefore?: boolean;
}

interface MenuProps {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** Fixed position for context menus. */
  position?: { x: number; y: number };
  className?: string;
}

export function Menu({ open, onClose, items, position, className = '' }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const style = position
    ? { top: Math.min(position.y, window.innerHeight - 260), left: position.x }
    : undefined;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97, y: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      role="menu"
      style={style}
      className={`${
        position ? 'fixed z-[95]' : 'absolute right-0 top-full z-50 mt-1'
      } min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl ${className}`}
    >
      {items.map((item, i) => (
        <div key={item.label + i}>
          {item.separatorBefore ? <div className="my-1 h-px bg-border" role="separator" /> : null}
          <button
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
              item.danger
                ? 'text-danger hover:bg-danger/10'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            {item.icon ? <span className="text-muted-foreground">{item.icon}</span> : null}
            {item.label}
          </button>
        </div>
      ))}
    </motion.div>
  );
}

'use client';

const PALETTE = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
];

const PALETTE_HEX = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#d946ef',
];

export function avatarColorHex(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE_HEX[hash % PALETTE_HEX.length]!;
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

function initials(name: string | null | undefined, email?: string): string {
  const source = (name ?? email ?? '?').trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

interface AvatarProps {
  name?: string | null;
  email?: string;
  image?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  seed?: string;
  title?: string;
  className?: string;
}

const sizeCls = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
};

export function Avatar({ name, email, image, size = 'md', seed, title, className = '' }: AvatarProps) {
  const s = sizeCls[size];
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? email ?? 'Avatar'}
        title={title ?? name ?? email}
        className={`${s} shrink-0 rounded-full object-cover ring-2 ring-surface ${className}`}
      />
    );
  }
  const colorSeed = seed ?? email ?? name ?? 'anon';
  return (
    <span
      title={title ?? name ?? email}
      className={`${s} ${avatarColor(colorSeed)} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface ${className}`}
    >
      {initials(name, email)}
    </span>
  );
}

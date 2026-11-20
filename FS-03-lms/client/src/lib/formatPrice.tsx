export function formatPrice(
  amount: number | string | null | undefined,
  currency = 'INR',
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }
): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;

  if (num === null || num === undefined || isNaN(num) || num === 0) {
    return 'Free';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    ...options,
  }).format(num / 100);
}

export function formatPriceCompact(
  amount: number | string | null | undefined,
  currency = 'INR'
): string {
  return formatPrice(amount, currency, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });
}

export interface PriceProps {
  amount: number | string | null | undefined;
  currency?: string;
  className?: string;
  compact?: boolean;
}

export function Price({ amount, currency = 'INR', className = '', compact = false }: PriceProps) {
  const isFree = amount === null || amount === undefined || Number(amount) === 0 || isNaN(Number(amount));
  const formatted = compact ? formatPriceCompact(amount, currency) : formatPrice(amount, currency);

  if (isFree) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 ${className}`}>
        Free
      </span>
    );
  }

  return (
    <span className={`font-bold text-indigo-600 ${className}`}>
      {formatted}
    </span>
  );
}
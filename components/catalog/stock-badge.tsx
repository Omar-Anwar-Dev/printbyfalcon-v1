import type { StockStatus } from '@/lib/catalog/stock';
import { STOCK_LABELS } from '@/lib/catalog/stock';

const COLORS: Record<StockStatus, string> = {
  IN_STOCK: 'bg-emerald-600 text-white',
  LOW_STOCK: 'bg-amber-500 text-white',
  OUT_OF_STOCK: 'bg-neutral-500 text-white',
};

export function StockBadge({
  status,
  locale,
  className = '',
}: {
  status: StockStatus;
  locale: 'ar' | 'en';
  className?: string;
}) {
  const label = STOCK_LABELS[locale][status];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${COLORS[status]} ${className}`}
    >
      {label}
    </span>
  );
}

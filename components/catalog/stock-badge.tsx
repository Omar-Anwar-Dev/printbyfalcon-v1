import type { StockStatus } from '@/lib/catalog/stock';
import { STOCK_LABELS } from '@/lib/catalog/stock';

const STYLES: Record<StockStatus, string> = {
  IN_STOCK: 'bg-success-soft text-success border border-success/20',
  LOW_STOCK: 'bg-warning-soft text-warning border border-warning/20',
  OUT_OF_STOCK: 'bg-paper-hover text-muted-foreground border border-border',
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[status]} ${className}`}
    >
      {label}
    </span>
  );
}

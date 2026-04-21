import { formatEgp } from '@/lib/catalog/price';

/**
 * Product price display. When the viewer is a B2B user with a tier or
 * per-SKU override, renders the negotiated price with the list price struck
 * through so the savings are visible. Non-B2B (guest / B2C) renders a
 * single-line base price.
 */
export function ProductPrice({
  finalPriceEgp,
  basePriceEgp,
  locale,
  className,
  listPriceClassName,
}: {
  /** The final price the customer will pay per unit. Decimal-string. */
  finalPriceEgp: string;
  /** The public / list price. If equal to `finalPriceEgp`, no strikethrough. Decimal-string. */
  basePriceEgp: string;
  locale: 'ar' | 'en';
  className?: string;
  listPriceClassName?: string;
}) {
  const hasDiscount = Number(finalPriceEgp) < Number(basePriceEgp);
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className ?? ''}`}>
      <span className="num font-semibold text-foreground">
        {formatEgp(finalPriceEgp, locale)}
      </span>
      {hasDiscount ? (
        <span
          className={`num text-xs text-muted-foreground line-through ${listPriceClassName ?? ''}`}
          aria-label={locale === 'ar' ? 'السعر قبل الخصم' : 'List price'}
        >
          {formatEgp(basePriceEgp, locale)}
        </span>
      ) : null}
    </span>
  );
}

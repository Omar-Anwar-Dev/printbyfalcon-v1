import Image from 'next/image';
import { Link } from '@/lib/i18n/routing';
import type { ProductListItem } from '@/lib/catalog/queries';
import { StockBadge } from '@/components/catalog/stock-badge';
import { ProductPrice } from '@/components/catalog/product-price';

export function ProductCard({
  product,
  locale,
  /**
   * Optional viewer-specific price (B2B tier / override). When omitted we
   * fall back to the product's list price. Sprint 7 — S7-D3-T1.
   */
  finalPriceEgp,
}: {
  product: ProductListItem;
  locale: 'ar' | 'en';
  finalPriceEgp?: string;
}) {
  const isAr = locale === 'ar';
  const name = isAr ? product.nameAr : product.nameEn;
  const displayPrice = finalPriceEgp ?? product.basePriceEgp;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-paper shadow-card transition-[transform,box-shadow,border-color] duration-base ease-out-smooth hover:-translate-y-0.5 hover:border-accent hover:shadow-popover"
    >
      <div className="relative aspect-square overflow-hidden bg-paper-hover">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-slow ease-out-smooth group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {isAr ? 'لا توجد صورة' : 'No image'}
          </div>
        )}
        {product.authenticity === 'COMPATIBLE' ? (
          <span className="absolute start-2 top-2 rounded-full border border-border bg-background/95 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
            {isAr ? 'متوافق' : 'Compatible'}
          </span>
        ) : null}
        {product.condition === 'USED' ? (
          <span className="absolute end-2 top-2 rounded-full border border-warning/30 bg-warning-soft/95 px-2 py-0.5 text-[11px] font-semibold text-warning backdrop-blur">
            {isAr ? 'مستعمل' : 'Used'}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {isAr ? product.brand.nameAr : product.brand.nameEn}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <ProductPrice
            finalPriceEgp={displayPrice}
            basePriceEgp={product.basePriceEgp}
            locale={locale}
            className="text-base"
          />
          <StockBadge status={product.stockStatus} locale={locale} />
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-paper">
      <div className="shimmer aspect-square" />
      <div className="space-y-2.5 p-4">
        <div className="shimmer h-3 w-16 rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-20 rounded" />
      </div>
    </div>
  );
}

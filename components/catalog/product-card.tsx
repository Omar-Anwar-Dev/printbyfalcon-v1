import Image from 'next/image';
import { Link } from '@/lib/i18n/routing';
import { formatEgp } from '@/lib/catalog/price';
import type { ProductListItem } from '@/lib/catalog/queries';

export function ProductCard({
  product,
  locale,
}: {
  product: ProductListItem;
  locale: 'ar' | 'en';
}) {
  const isAr = locale === 'ar';
  const name = isAr ? product.nameAr : product.nameEn;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-background transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {isAr ? 'لا توجد صورة' : 'No image'}
          </div>
        )}
        {product.authenticity === 'COMPATIBLE' ? (
          <span className="absolute start-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-white">
            {isAr ? 'متوافق' : 'Compatible'}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-xs text-muted-foreground">
          {isAr ? product.brand.nameAr : product.brand.nameEn}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {name}
        </h3>
        <p className="mt-auto text-base font-semibold">
          {formatEgp(product.basePriceEgp, locale)}
        </p>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

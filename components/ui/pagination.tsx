import type { ComponentProps } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

type LinkHref = ComponentProps<typeof Link>['href'];

type Props = {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => LinkHref;
  locale: 'ar' | 'en';
  className?: string;
};

/**
 * Storefront pagination — Prev / page indicator / Next, comfortably spaced
 * (gap-4 mobile → gap-8 desktop) so the indicator doesn't crowd the controls.
 * Returns null when there's only one page.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  locale,
  className,
}: Props) {
  if (totalPages <= 1) return null;
  const isAr = locale === 'ar';
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const PrevIcon = isAr ? ChevronRight : ChevronLeft;
  const NextIcon = isAr ? ChevronLeft : ChevronRight;

  const enabled =
    'inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const disabled =
    'inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-4 text-sm font-medium text-muted-foreground opacity-50';

  return (
    <nav
      aria-label={isAr ? 'التنقل بين الصفحات' : 'Pagination'}
      className={
        className ??
        'mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8'
      }
    >
      {prevDisabled ? (
        <span aria-disabled className={disabled}>
          <PrevIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
          {isAr ? 'السابق' : 'Previous'}
        </span>
      ) : (
        <Link href={hrefForPage(page - 1)} className={enabled} rel="prev">
          <PrevIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
          {isAr ? 'السابق' : 'Previous'}
        </Link>
      )}

      <span
        className="text-sm text-muted-foreground"
        aria-current="page"
        aria-label={
          isAr
            ? `صفحة ${page} من ${totalPages}`
            : `Page ${page} of ${totalPages}`
        }
      >
        {isAr ? 'صفحة' : 'Page'}{' '}
        <span className="num font-semibold text-foreground">{page}</span>{' '}
        {isAr ? 'من' : 'of'} <span className="num">{totalPages}</span>
      </span>

      {nextDisabled ? (
        <span aria-disabled className={disabled}>
          {isAr ? 'التالي' : 'Next'}
          <NextIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
      ) : (
        <Link href={hrefForPage(page + 1)} className={enabled} rel="next">
          {isAr ? 'التالي' : 'Next'}
          <NextIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      )}
    </nav>
  );
}

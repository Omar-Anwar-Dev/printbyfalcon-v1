'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/lib/i18n/routing';
import { locales, localeLabel } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /**
   * `'default'` — for white surfaces (footer internal sections, legacy).
   * `'dark'`    — for the primary ink header bar (Sprint 11 ADR-059).
   */
  variant?: 'default' | 'dark';
};

export function LanguageSwitcher({ className, variant = 'default' }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Preserve any active query string (filters, sort, page, search query…)
  // when switching locale. Without this the catalog filter chips, search
  // results, and order-history pagination all reset to defaults on a
  // language toggle, which is jarring mid-flow.
  const queryString = searchParams.toString();
  const targetPath = queryString ? `${pathname}?${queryString}` : pathname;

  const isDark = variant === 'dark';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border p-0.5 text-sm',
        isDark ? 'border-canvas/20' : 'border-border',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            className={cn(
              'rounded-sm px-2.5 py-1 font-medium transition-colors',
              active
                ? isDark
                  ? 'bg-canvas text-ink'
                  : 'bg-ink text-canvas'
                : isDark
                  ? 'text-canvas/75 hover:text-canvas'
                  : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={active}
            onClick={() => router.replace(targetPath, { locale: loc })}
          >
            {localeLabel[loc]}
          </button>
        );
      })}
    </div>
  );
}

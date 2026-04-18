'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/routing';
import { locales, localeLabel } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      {locales.map((loc, idx) => {
        const active = loc === locale;
        return (
          <span key={loc} className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                'rounded px-2 py-1 transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={active}
              onClick={() => router.replace(pathname, { locale: loc })}
            >
              {localeLabel[loc]}
            </button>
            {idx < locales.length - 1 ? (
              <span className="text-muted-foreground">·</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

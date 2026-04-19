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
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border p-0.5 text-sm',
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
                ? 'bg-ink text-canvas'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={active}
            onClick={() => router.replace(pathname, { locale: loc })}
          >
            {localeLabel[loc]}
          </button>
        );
      })}
    </div>
  );
}

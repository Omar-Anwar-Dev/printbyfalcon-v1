'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Locale-scoped error boundary. Catches thrown errors inside /[locale]/* routes.
 * Must be a client component per the App Router contract. Rendered inside the
 * root <html>/<body>, so the ToastProvider + SiteHeader are NOT mounted here —
 * keep the UI self-contained.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[locale error]', error);
    }
  }, [error]);

  return (
    <section className="container-page flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-error-soft text-error">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {isAr ? 'خطأ غير متوقع' : 'Something broke'}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'}
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        {isAr
          ? 'فريقنا يتلقى إشعارًا بهذه الأخطاء تلقائيًا. جرّب إعادة المحاولة أو العودة للصفحة الرئيسية.'
          : 'Our team is automatically notified of errors like this. Try again or head back to the homepage.'}
      </p>
      {error.digest ? (
        <p className="num mt-6 rounded-md bg-paper px-3 py-1.5 text-xs text-muted-foreground">
          ID: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} variant="accent" size="lg">
          <RotateCcw className="me-2 h-5 w-5" strokeWidth={1.75} aria-hidden />
          {isAr ? 'إعادة المحاولة' : 'Try again'}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/${locale}`}>
            <ArrowLeft
              className="me-2 h-5 w-5 rtl:rotate-180"
              strokeWidth={1.75}
              aria-hidden
            />
            {isAr ? 'الصفحة الرئيسية' : 'Go home'}
          </Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Root not-found — shown for requests that don't match any locale prefix.
 * Locale-aware 404s live in app/[locale]/not-found.tsx. This fallback defaults
 * to Arabic (our primary locale) per lib/i18n/config.ts.
 */
import Link from 'next/link';

export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-canvas text-foreground">
        <main className="container-page flex min-h-screen flex-col items-center justify-center py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            الصفحة غير موجودة
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            الصفحة التي تبحث عنها تم نقلها أو لم تعد متاحة.
          </p>
          <Link
            href="/ar"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-accent px-6 text-base font-medium text-canvas transition-colors hover:bg-accent-strong"
          >
            الصفحة الرئيسية
          </Link>
          <Link
            href="/en"
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Continue in English
          </Link>
        </main>
      </body>
    </html>
  );
}

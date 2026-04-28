import { getLocale } from 'next-intl/server';
import { FileQuestion, Search } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import { getStoreInfo } from '@/lib/settings/store-info';

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const store = await getStoreInfo();

  // Build a WhatsApp deep-link to the sales team if configured. Replaces the
  // previous static link to /contact, which never existed as a route — so the
  // 404 page's own "need help?" affordance was itself a 404.
  const supportPhone = (store.supportWhatsapp || '').replace(/[^0-9]/g, '');
  const supportMessage = isAr
    ? 'مرحبًا، وصلت لصفحة غير موجودة على الموقع.'
    : 'Hi, I landed on a 404 page on the site.';
  const supportHref = supportPhone
    ? `https://wa.me/${supportPhone}?text=${encodeURIComponent(supportMessage)}`
    : null;

  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
        <FileQuestion className="h-7 w-7" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {isAr ? 'خطأ 404' : 'Error 404'}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {isAr ? 'الصفحة غير موجودة' : 'Page not found'}
      </h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        {isAr
          ? 'الصفحة التي تبحث عنها تم نقلها أو لم تعد متاحة. جرّب البحث أو العودة للصفحة الرئيسية.'
          : 'The page you’re looking for has moved or is no longer available. Try searching or head back to the homepage.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="accent" size="lg">
          <Link href="/">{isAr ? 'الصفحة الرئيسية' : 'Go home'}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/search">
            <Search className="me-2 h-5 w-5" strokeWidth={1.75} aria-hidden />
            {isAr ? 'البحث في المتجر' : 'Search the store'}
          </Link>
        </Button>
      </div>
      {supportHref ? (
        <p className="mt-10 text-sm text-muted-foreground">
          {isAr ? 'تحتاج مساعدة؟' : 'Need help?'}{' '}
          <a
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-strong hover:underline"
          >
            {isAr ? 'راسلنا على واتساب' : 'Message us on WhatsApp'}
          </a>
        </p>
      ) : null}
    </section>
  );
}

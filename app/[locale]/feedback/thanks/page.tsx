import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'شكرًا — وصلتنا ملاحظتك' : 'Thanks — feedback received',
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackThanksPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';
  return (
    <main
      className="container-page max-w-xl py-16 text-center"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="rounded-xl border border-success/30 bg-success-soft p-8">
        <h1 className="text-2xl font-bold text-success">
          {isAr ? 'شكرًا — وصلتنا ملاحظتك' : 'Thanks — we got your feedback'}
        </h1>
        <p className="mt-3 text-sm text-foreground/80">
          {isAr
            ? 'الفريق هيراجع ملاحظتك خلال يومين عمل. لو سيبت لنا وسيلة تواصل، هنرد عليك بمجرد ما نراجعها.'
            : "Our team will review it within two business days. If you left contact details, we'll get back to you as soon as we have."}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {isAr ? 'الرجوع للرئيسية' : 'Back to home'}
          </Link>
          <Link
            href="/feedback"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:border-accent/40"
          >
            {isAr ? 'إرسال ملاحظة أخرى' : 'Send another note'}
          </Link>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { getOptionalUser } from '@/lib/auth';
import { FeedbackForm } from '@/components/feedback/feedback-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'شاركنا رأيك' : 'Share your feedback',
    description: isAr
      ? 'نرحّب باقتراحاتك وملاحظاتك بشأن المتجر — كل ملاحظة بتساعدنا نحسّن قبل الإطلاق العام.'
      : 'We welcome your suggestions and bug reports — every note helps us improve before the public launch.',
    robots: { index: true, follow: true },
  };
}

export default async function FeedbackPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';
  const user = await getOptionalUser();

  const prefill = {
    contactName: user?.name ?? null,
    contactValue: user?.email ?? user?.phone ?? null,
  };

  return (
    <main
      className="container-page max-w-3xl py-10 md:py-14"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'الإطلاق التجريبي' : 'Closed beta'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isAr ? 'شاركنا رأيك' : 'Share your feedback'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr
            ? 'كل ملاحظة بتساعدنا نحسّن الخدمة قبل الإطلاق العام. ولو محتاج تواصل سريع، استخدم زر واتساب اللي تحت في أي وقت.'
            : 'Every note helps us improve before the public launch. For anything urgent, use the WhatsApp button at the bottom of the page anytime.'}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-paper p-6">
        <FeedbackForm locale={locale} prefill={prefill} />
      </section>
    </main>
  );
}

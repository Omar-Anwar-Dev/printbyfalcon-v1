import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { JsonLd } from '@/components/seo/json-ld';
import { buildFaqPage, buildBreadcrumbList } from '@/lib/seo/structured-data';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  type FaqCategoryKey,
} from '@/lib/seo/faq-data';

export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const title = isAr
    ? 'الأسئلة الشائعة | برينت باي فالكون'
    : 'FAQ | Print By Falcon';
  const description = isAr
    ? 'إجابات سريعة عن الطلب والدفع، التوصيل، الإلغاء، الاسترجاع، وحسابات الشركات. كل ما تحتاجه عشان تطلب أحبار وطابعات بثقة من برينت باي فالكون.'
    : 'Quick answers about ordering, payment, delivery, cancellation, returns, and business accounts. Everything you need to order printers and supplies confidently from Print By Falcon.';
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/faq`,
      languages: {
        ar: `${BASE_URL}/ar/faq`,
        en: `${BASE_URL}/en/faq`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}/${locale}/faq`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function FaqPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const isAr = locale === 'ar';

  // Group items by category for rendering.
  const grouped = (Object.keys(FAQ_CATEGORIES) as FaqCategoryKey[]).map(
    (key) => ({
      key,
      label: FAQ_CATEGORIES[key][locale],
      items: FAQ_ITEMS.filter((i) => i.category === key),
    }),
  );

  // FAQ schema in the active locale only — Google parses one language at a time.
  const faqSchema = buildFaqPage(
    FAQ_ITEMS.map((i) => ({
      question: i.question[locale],
      answer: i.answer[locale],
    })),
  );
  const breadcrumbSchema = buildBreadcrumbList([
    { name: isAr ? 'الرئيسية' : 'Home', path: `/${locale}` },
    {
      name: isAr ? 'الأسئلة الشائعة' : 'FAQ',
      path: `/${locale}/faq`,
    },
  ]);

  return (
    <main className="container-page max-w-3xl py-12" dir={isAr ? 'rtl' : 'ltr'}>
      <JsonLd data={[faqSchema, breadcrumbSchema]} id="faq-schema" />

      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'الدعم' : 'Support'}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {isAr
            ? 'إجابات سريعة عن أكثر الأسئلة اللي بتوصلنا. مش لاقي إجابة سؤالك؟ تواصل معنا على الواتساب — هنرد على طول.'
            : "Quick answers to the questions we hear most. Can't find what you're looking for? Reach out on WhatsApp — we'll respond quickly."}
        </p>
      </header>

      <div className="space-y-12">
        {grouped.map((group) => (
          <section key={group.key} aria-labelledby={`faq-${group.key}`}>
            <h2
              id={`faq-${group.key}`}
              className="mb-4 border-b border-border pb-2 text-lg font-semibold tracking-tight text-foreground"
            >
              {group.label}
            </h2>
            <ul className="space-y-5">
              {group.items.map((item, idx) => (
                <li
                  key={`${group.key}-${idx}`}
                  className="rounded-xl border border-border bg-paper p-5"
                >
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-foreground">
                      <span>{item.question[locale]}</span>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.answer[locale]}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-12 rounded-xl border border-accent/20 bg-accent-soft p-6 text-sm">
        <h3 className="font-semibold text-accent-strong">
          {isAr ? 'محتاج مساعدة أكتر؟' : 'Need more help?'}
        </h3>
        <p className="mt-1 text-foreground/80">
          {isAr
            ? 'استخدم زر "تواصل معنا" على الواتساب أسفل الصفحة، أو ابعت بريد إلكتروني على'
            : 'Use the "Chat with us" WhatsApp button at the bottom of the page, or email us at'}{' '}
          <a
            href="mailto:support@printbyfalcon.com"
            className="font-medium underline underline-offset-2"
          >
            support@printbyfalcon.com
          </a>
        </p>
      </footer>
    </main>
  );
}

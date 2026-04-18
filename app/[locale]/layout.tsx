import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { locales, localeDir } from '@/lib/i18n/config';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'برينت باي فالكون' : 'Print By Falcon',
    description: isAr
      ? 'متجر متخصص في الطابعات ومستلزماتها'
      : 'Specialist store for printers and supplies',
    alternates: {
      languages: { ar: '/ar', en: '/en' },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeDir[locale as (typeof locales)[number]];

  return (
    <NextIntlClientProvider messages={messages}>
      <Script id="set-html-attrs" strategy="beforeInteractive">
        {`document.documentElement.lang='${locale}';document.documentElement.dir='${dir}';`}
      </Script>
      <div className="flex min-h-screen flex-col" dir={dir} lang={locale}>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}

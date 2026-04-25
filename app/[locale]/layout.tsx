import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ToastProvider } from '@/components/ui/toast';
import { WhatsAppChatButton } from '@/components/whatsapp-chat-button';
import { CookieConsent } from '@/components/cookie-consent';
import { locales, localeDir } from '@/lib/i18n/config';
import { getStoreInfo } from '@/lib/settings/store-info';

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
  const storeInfo = await getStoreInfo();

  return (
    <NextIntlClientProvider messages={messages}>
      <Script id="set-html-attrs" strategy="beforeInteractive">
        {`document.documentElement.lang='${locale}';document.documentElement.dir='${dir}';`}
      </Script>
      <ToastProvider>
        <div
          className="flex min-h-screen w-full max-w-full flex-col overflow-x-clip"
          dir={dir}
          lang={locale}
        >
          <SiteHeader locale={locale} />
          <main className="w-full max-w-full flex-1 overflow-x-clip">
            {children}
          </main>
          <SiteFooter />
          {storeInfo.supportWhatsapp ? (
            <WhatsAppChatButton
              supportNumber={storeInfo.supportWhatsapp}
              locale={locale}
            />
          ) : null}
          <CookieConsent locale={locale as 'ar' | 'en'} />
        </div>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}

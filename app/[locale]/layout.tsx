import type { Metadata } from 'next';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ToastProvider } from '@/components/ui/toast';
import { WhatsAppChatButton } from '@/components/whatsapp-chat-button';
import { CookieConsent } from '@/components/cookie-consent';
import { locales, localeDir } from '@/lib/i18n/config';
import { getStoreInfo } from '@/lib/settings/store-info';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

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

  // `<html>` lives here (not in `app/layout.tsx`) so `dir` and `lang` are
  // baked into the server-rendered HTML. Without that, the document defaults
  // to LTR for the first paint, which on RTL viewports shifts the whole
  // layout — content that should start at the right edge gets pushed past
  // the viewport, leaving a white band on the start side. See ADR-060.
  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${plexArabic.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <SiteHeader locale={locale} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            {storeInfo.supportWhatsapp ? (
              <WhatsAppChatButton
                supportNumber={storeInfo.supportWhatsapp}
                locale={locale}
              />
            ) : null}
            <CookieConsent locale={locale as 'ar' | 'en'} />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ToastProvider } from '@/components/ui/toast';
import { WhatsAppChatButton } from '@/components/whatsapp-chat-button';
import { CookieConsent } from '@/components/cookie-consent';
import { JsonLd } from '@/components/seo/json-ld';
import { locales, localeDir } from '@/lib/i18n/config';
import { getStoreInfo } from '@/lib/settings/store-info';
import { brandLogoUrl } from '@/lib/storage/paths';
import {
  buildOrganization,
  buildLocalBusiness,
  buildWebSite,
  toE164Egyptian,
} from '@/lib/seo/structured-data';

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

const APP_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  // Layout metadata is the default that nested pages override. Includes
  // metadataBase so per-page Open Graph URLs resolve correctly + a default
  // title-template so child pages can pass just the page name.
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: isAr
        ? 'برينت باي فالكون | متجر الطابعات وأحبار الطابعات في مصر'
        : 'Print By Falcon | Printers & Toner Cartridges in Egypt',
      template: isAr ? '%s | برينت باي فالكون' : '%s | Print By Falcon',
    },
    description: isAr
      ? 'متجر متخصص في الطابعات وأحبار وتونر الطابعات الأصلية والمتوافقة في مصر. شحن لكل المحافظات، الدفع عند الاستلام، أسعار جملة للشركات.'
      : 'Specialist online store for printers, toner, and ink cartridges (genuine + compatible) in Egypt. Nationwide delivery, cash on delivery, wholesale pricing for businesses.',
    keywords: isAr
      ? [
          'طابعات',
          'طابعات HP',
          'طابعات Canon',
          'طابعات Epson',
          'تونر طابعة',
          'حبر طابعة',
          'خرطوشة تونر',
          'خرطوشة حبر',
          'تونر متوافق',
          'تونر أصلي',
          'مستلزمات الطباعة',
          'متجر طابعات مصر',
          'برينت باي فالكون',
        ]
      : [
          'printers Egypt',
          'toner cartridges Egypt',
          'ink cartridges Egypt',
          'HP toner Egypt',
          'Canon toner Egypt',
          'compatible toner',
          'genuine toner',
          'printer supplies',
          'Print By Falcon',
        ],
    alternates: {
      canonical: `${APP_URL}/${locale}`,
      languages: { ar: `${APP_URL}/ar`, en: `${APP_URL}/en` },
    },
    openGraph: {
      type: 'website',
      siteName: isAr ? 'برينت باي فالكون' : 'Print By Falcon',
      locale: isAr ? 'ar_EG' : 'en_US',
      url: `${APP_URL}/${locale}`,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
    applicationName: isAr ? 'برينت باي فالكون' : 'Print By Falcon',
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

  // Skip the storefront chrome (header, footer, floating WhatsApp, cookie
  // banner) on /admin routes — admin gets its own ink-shell topbar +
  // sidebar from `app/[locale]/admin/layout.tsx`. Path is forwarded by
  // middleware via the `x-pathname` request header.
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const isAdminRoute = /^\/(?:ar|en)\/admin(?:\/|$)/.test(pathname);

  const storeInfo = isAdminRoute ? null : await getStoreInfo();
  const supportWhatsapp = storeInfo?.supportWhatsapp ?? '';

  // Sprint 13 — schema.org structured data on every storefront page.
  // Skipped on admin (internal tooling, no SEO surface).
  const seoGraph =
    !isAdminRoute && storeInfo
      ? (() => {
          const phoneE164 = toE164Egyptian(
            storeInfo.phone && storeInfo.phone !== '—'
              ? storeInfo.phone
              : storeInfo.supportWhatsapp || '+201116527773',
          );
          const logoUrl = storeInfo.logoFilename
            ? brandLogoUrl(storeInfo.logoFilename)
            : undefined;
          return [
            buildOrganization({
              nameAr: storeInfo.nameAr,
              nameEn: storeInfo.nameEn,
              email: storeInfo.email,
              phoneE164,
              logoUrl,
            }),
            buildLocalBusiness({
              nameAr: storeInfo.nameAr,
              nameEn: storeInfo.nameEn,
              email: storeInfo.email,
              phoneE164,
              addressAr: storeInfo.addressAr,
              addressEn: storeInfo.addressEn,
              logoUrl,
            }),
            buildWebSite({
              nameAr: storeInfo.nameAr,
              nameEn: storeInfo.nameEn,
            }),
          ];
        })()
      : null;

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
            {isAdminRoute ? (
              <div className="flex flex-1 flex-col">{children}</div>
            ) : (
              <>
                {seoGraph ? <JsonLd data={seoGraph} id="site-schema" /> : null}
                <SiteHeader locale={locale} />
                <main className="flex-1">{children}</main>
                <SiteFooter />
                {supportWhatsapp ? (
                  <WhatsAppChatButton
                    supportNumber={supportWhatsapp}
                    locale={locale}
                  />
                ) : null}
                <CookieConsent locale={locale as 'ar' | 'en'} />
              </>
            )}
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import { setRequestLocale } from 'next-intl/server';
import { PortalTabs, type PortalTab } from '@/components/portal-tabs';

/**
 * B2C account shell — adds a horizontal tabs nav above all `/account/*`
 * routes so customers can hop between Overview and Addresses without
 * going back through the site header.
 *
 * Layouts in Next.js wrap every nested page; pages keep their own
 * `<main className="container-page …">` so we don't nest `<main>`.
 *
 * Locale + tab icons:
 *   - `params.locale` is read directly (not via `getLocale()`) so we can
 *     also pass it to `setRequestLocale()` — required for next-intl APIs
 *     in nested layouts under static-rendering boundaries.
 *   - Icons go across the server→client boundary as NAME strings
 *     (`PortalTabIconName`), not Lucide component references — passing
 *     the components directly fails serialization in production.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isAr = locale === 'ar';

  const tabs: PortalTab[] = [
    {
      href: '/account',
      label: isAr ? 'حسابي' : 'My account',
      icon: 'user',
    },
    {
      href: '/account/addresses',
      label: isAr ? 'العناوين' : 'Addresses',
      icon: 'map-pin',
    },
  ];

  return (
    <>
      <PortalTabs
        tabs={tabs}
        ariaLabel={isAr ? 'تنقّل الحساب' : 'Account navigation'}
      />
      {children}
    </>
  );
}

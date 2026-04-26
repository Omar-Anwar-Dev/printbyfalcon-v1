import { setRequestLocale } from 'next-intl/server';
import { PortalTabs, type PortalTab } from '@/components/portal-tabs';

/**
 * B2B portal shell — wraps the three signed-in portal pages
 * (`/b2b/profile`, `/b2b/orders`, `/b2b/bulk-order`) with a horizontal
 * tabs nav so company users can hop between sections without going
 * back through the site header.
 *
 * Lives in a `(portal)` route group so the B2B auth surfaces (login,
 * register, forgot-password, reset-password) stay outside this shell —
 * they're for unauthenticated visitors and shouldn't show portal nav.
 *
 * Locale + tab icons:
 *   - `params.locale` is read directly (not via `getLocale()`) so we can
 *     also pass it to `setRequestLocale()` — required for next-intl APIs
 *     in nested layouts under static-rendering boundaries.
 *   - Icons go across the server→client boundary as NAME strings
 *     (`PortalTabIconName`), not Lucide component references — passing
 *     the components directly fails serialization in production.
 */
export default async function B2BPortalLayout({
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
      href: '/b2b/profile',
      label: isAr ? 'بيانات الشركة' : 'Company profile',
      icon: 'building',
    },
    {
      href: '/b2b/orders',
      label: isAr ? 'طلبات الشركة' : 'Company orders',
      icon: 'package',
    },
    {
      href: '/b2b/bulk-order',
      label: isAr ? 'طلب مُجمَّع' : 'Bulk order',
      icon: 'list-checks',
    },
  ];

  return (
    <>
      <PortalTabs
        tabs={tabs}
        ariaLabel={isAr ? 'تنقّل بوابة الشركات' : 'Business portal navigation'}
      />
      {children}
    </>
  );
}

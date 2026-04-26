import { getLocale } from 'next-intl/server';
import { Building, Package, ListChecks } from 'lucide-react';
import { PortalTabs } from '@/components/portal-tabs';

/**
 * B2B portal shell — wraps the three signed-in portal pages
 * (`/b2b/profile`, `/b2b/orders`, `/b2b/bulk-order`) with a horizontal
 * tabs nav so company users can hop between sections without going
 * back through the site header.
 *
 * Lives in a `(portal)` route group so the B2B auth surfaces (login,
 * register, forgot-password, reset-password) stay outside this shell —
 * they're for unauthenticated visitors and shouldn't show portal nav.
 */
export default async function B2BPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const isAr = locale === 'ar';

  const tabs = [
    {
      href: '/b2b/profile',
      label: isAr ? 'بيانات الشركة' : 'Company profile',
      icon: Building,
    },
    {
      href: '/b2b/orders',
      label: isAr ? 'طلبات الشركة' : 'Company orders',
      icon: Package,
    },
    {
      href: '/b2b/bulk-order',
      label: isAr ? 'طلب مُجمَّع' : 'Bulk order',
      icon: ListChecks,
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

import { getLocale } from 'next-intl/server';
import { User, MapPin } from 'lucide-react';
import { PortalTabs } from '@/components/portal-tabs';

/**
 * B2C account shell — adds a horizontal tabs nav above all `/account/*`
 * routes so customers can hop between Overview and Addresses without
 * going back through the site header.
 *
 * Layouts in Next.js wrap every nested page; pages keep their own
 * `<main className="container-page …">` so we don't nest `<main>`.
 * The tabs strip is full-bleed on mobile (negative `mx`) and centered
 * on desktop, matching the storefront's visual language.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const isAr = locale === 'ar';

  const tabs = [
    {
      href: '/account',
      label: isAr ? 'حسابي' : 'My account',
      icon: User,
    },
    {
      href: '/account/addresses',
      label: isAr ? 'العناوين' : 'Addresses',
      icon: MapPin,
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

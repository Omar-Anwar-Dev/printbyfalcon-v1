import { setRequestLocale } from 'next-intl/server';
import { getOptionalUser } from '@/lib/auth';
import { PortalTabs, type PortalTab } from '@/components/portal-tabs';

/**
 * Account-area shell — adds a horizontal tabs nav above `/account/*` routes.
 *
 * The tabs (My account / Addresses) are B2C-only. /account/orders/[id]
 * is shared between B2C and B2B (a B2B user clicks an order in their
 * company-orders list and lands here), but a B2B user has no business
 * with the B2C address book + dashboard — so for them we render the
 * children plain and let the storefront header carry navigation. This
 * also avoids the "click Addresses → bounce to /sign-in" trap the
 * B2C-only guard on /account/addresses creates for authenticated B2B
 * users.
 *
 * Layouts in Next.js wrap every nested page; pages keep their own
 * `<main className="container-page …">` so we don't nest `<main>`.
 *
 * Locale + tab icons:
 *   - `params.locale` is passed to `setRequestLocale()` (required for
 *     next-intl APIs in nested layouts under static-rendering).
 *   - Icons go across the server→client boundary as NAME strings, not
 *     Lucide refs — see `PortalTabs` for why.
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

  const user = await getOptionalUser();
  const isB2B = user?.type === 'B2B';

  // B2B users can land on /account/orders/[id] but shouldn't see the
  // B2C account tabs — they have their own portal nav at /b2b/(portal)/
  // and the addresses tab leads to a route that bounces them anyway.
  if (isB2B) {
    return <>{children}</>;
  }

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

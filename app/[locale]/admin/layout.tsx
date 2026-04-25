import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { getOptionalUser } from '@/lib/auth';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { BrandMark } from '@/components/brand-mark';
import { AdminSideNav } from '@/components/admin/admin-side-nav';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { getAdminNavGroups } from '@/lib/admin/nav-config';

/**
 * Admin shell.
 *
 * Topbar (sticky, ink) — brand mark + admin label, language switcher,
 * email, logout. Mobile gets a hamburger that opens the same nav as
 * the desktop sidebar (drawer pattern from the storefront mobile nav).
 *
 * Body — desktop sidebar (`w-60` pinned to the start edge) + page-content
 * column. Pages keep their own `<main className="container-page …">`
 * wrapper so we don't nest `<main>` elements; the layout exposes a
 * full-width content slot where each page applies its own container.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const user = await getOptionalUser();
  const role = user?.type === 'ADMIN' ? (user.adminRole ?? null) : null;

  const navLabels = {
    dashboard: t('admin.nav.dashboard'),
    products: t('admin.nav.products'),
    brands: t('admin.nav.brands'),
    categories: t('admin.nav.categories'),
    printerModels: t('admin.nav.printerModels'),
    orders: t('admin.nav.orders'),
    returns: t('admin.nav.returns'),
    couriers: t('admin.nav.couriers'),
    inventory: t('admin.nav.inventory'),
    customers: t('admin.nav.customers'),
    b2bApplications: t('admin.nav.b2bApplications'),
    b2bPendingConfirmation: t('admin.nav.b2bPendingConfirmation'),
    b2bCompanies: t('admin.nav.b2bCompanies'),
    users: t('admin.nav.users'),
    settings: t('admin.nav.settings'),
    groupCatalog: isAr ? 'الكتالوج' : 'Catalog',
    groupOrders: isAr ? 'الطلبات والمخزون' : 'Orders & Inventory',
    groupCustomers: isAr ? 'العملاء' : 'Customers',
    groupB2B: isAr ? 'الشركات (B2B)' : 'Business (B2B)',
    groupAdmin: isAr ? 'الإدارة' : 'Administration',
  };

  const navGroups = getAdminNavGroups(role, navLabels);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-canvas/10 bg-ink text-canvas">
        <div className="container-page flex h-14 items-center gap-3">
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 sm:text-base"
          >
            <BrandMark size={28} />
            <span className="hidden sm:inline">{t('admin.loginTitle')}</span>
          </Link>

          <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? (
              <span className="hidden text-sm text-canvas/70 lg:inline">
                {user.email ?? user.name}
              </span>
            ) : null}
            <LanguageSwitcher
              variant="dark"
              className="hidden sm:inline-flex"
            />
            {user ? (
              <LogoutButton
                variant="topbar"
                label={isAr ? 'خروج' : 'Sign out'}
                pendingLabel={isAr ? 'جارٍ الخروج...' : 'Signing out...'}
              />
            ) : null}
            {role ? (
              <AdminMobileNav
                groups={navGroups}
                labels={{
                  open: isAr ? 'قائمة الإدارة' : 'Admin menu',
                  close: isAr ? 'إغلاق' : 'Close',
                }}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1">
        {role ? (
          <aside className="hidden w-60 shrink-0 border-e border-border bg-paper md:block">
            <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              <AdminSideNav groups={navGroups} />
            </div>
          </aside>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

import { getTranslations } from 'next-intl/server';
import { ShoppingBag, User, LogIn } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { HeaderSearch } from '@/components/header-search';
import { MobileNav } from '@/components/mobile-nav';
import { BrandMark } from '@/components/brand-mark';
import { CategoriesNavBar } from '@/components/categories-nav-bar';
import { getOptionalUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildTree, type FlatCategory } from '@/lib/catalog/category-tree';
import { getActiveCart } from '@/lib/cart/cart';

type TopCategory = {
  id: string;
  parentId: string | null;
  position: number;
  slug: string;
  nameAr: string;
  nameEn: string;
};

/**
 * Two-bar header (ADR-059 — Sprint 11 UI refiner v2).
 *
 * Bar 1: solid ink — logo + full-width search + actions cluster + mobile hamburger (end-side).
 * Bar 2: white border-bottom strip — primary categories nav. Hidden on mobile; MobileNav carries it.
 * On mobile a third row appears below Bar 1 (inside the ink surface) with the search, so
 * typing space is never pushed below the fold.
 */
export async function SiteHeader({ locale }: { locale?: string } = {}) {
  const t = await getTranslations();
  const user = await getOptionalUser();
  const isAr = locale === 'ar';

  const cart = await getActiveCart();
  const cartCount = cart
    ? await prisma.cartItem
        .aggregate({
          where: { cartId: cart.id },
          _sum: { qty: true },
        })
        .then((r) => r._sum.qty ?? 0)
    : 0;

  let rows: TopCategory[] = [];
  try {
    rows = await prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
      select: {
        id: true,
        parentId: true,
        position: true,
        slug: true,
        nameAr: true,
        nameEn: true,
      },
    });
  } catch (err) {
    console.error(
      '[site-header] category.findMany failed:',
      err instanceof Error ? err.message : err,
      err instanceof Error && err.stack ? `\n${err.stack}` : '',
    );
  }
  const flat: FlatCategory<TopCategory>[] = rows.map((r) => ({ ...r }));
  const tree = buildTree(flat);
  const topCategories = tree.slice(0, 8);

  const headerLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const otherLocale = isAr ? 'en' : 'ar';
  const otherLocaleLabel = isAr ? 'English' : 'العربية';

  const mobileCategories = topCategories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    label: isAr ? cat.nameAr : cat.nameEn,
    children: cat.children.map((child) => ({
      id: child.id,
      slug: child.slug,
      label: isAr ? child.nameAr : child.nameEn,
    })),
  }));

  const allLabel = isAr ? 'كل' : 'All';

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Bar 1 — Ink primary */}
      <div className="bg-ink text-canvas">
        <div className="container-page flex h-16 items-center gap-3 sm:gap-4">
          {/* Logo (start-side) */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-canvas transition-opacity hover:opacity-90 sm:text-lg"
          >
            <BrandMark size={36} />
            <span className="hidden sm:inline">{t('brand.name')}</span>
          </Link>

          {/* Search — prominent, fills center on desktop */}
          <div className="hidden flex-1 justify-center px-2 md:flex lg:px-6">
            <HeaderSearch locale={headerLocale} />
          </div>

          {/* Actions cluster (end-side) */}
          <div className="ms-auto flex shrink-0 items-center gap-1 md:gap-2">
            <LanguageSwitcher
              variant="dark"
              className="hidden lg:inline-flex"
            />

            <Link
              href="/cart"
              className="relative inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 sm:px-3"
              aria-label={t('nav.cart')}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span className="hidden sm:inline">{t('nav.cart')}</span>
              {cartCount > 0 ? (
                <span
                  className="num absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground sm:static sm:end-auto sm:top-auto"
                  aria-label={
                    isAr ? `${cartCount} عنصر في السلة` : `${cartCount} in cart`
                  }
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>

            {user ? (
              <Link
                href={user.type === 'B2B' ? '/b2b/profile' : '/account'}
                className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 sm:inline-flex"
              >
                <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                <span>{t('nav.account')}</span>
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 sm:inline-flex"
              >
                <LogIn className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                <span>{t('nav.login')}</span>
              </Link>
            )}

            {/* Mobile hamburger — end-side (last child = end in flex default order) */}
            <MobileNav
              categories={mobileCategories}
              isSignedIn={!!user}
              cartCount={cartCount}
              otherLocale={otherLocale}
              otherLocaleHref={`/${otherLocale}`}
              otherLocaleLabel={otherLocaleLabel}
              labels={{
                openMenu: isAr ? 'القائمة' : 'Menu',
                closeMenu: isAr ? 'إغلاق' : 'Close',
                home: t('nav.home'),
                catalog: t('nav.catalog'),
                categoriesHeading: isAr ? 'الفئات' : 'Categories',
                accountHeading: isAr ? 'الحساب' : 'Account',
                account: t('nav.account'),
                login: t('nav.login'),
                logout: isAr ? 'تسجيل الخروج' : 'Sign out',
                cart: t('nav.cart'),
                language: t('common.languageSwitcher'),
                business: isAr ? 'للشركات' : 'For Business',
                allLabel,
              }}
            />
          </div>
        </div>

        {/* Mobile search (below Bar 1, still on ink surface) */}
        <div className="container-page pb-3 md:hidden">
          <HeaderSearch locale={headerLocale} />
        </div>
      </div>

      {/* Bar 2 — Categories strip (desktop only, browsing pages only). */}
      <CategoriesNavBar
        categories={topCategories.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
        }))}
        isAr={isAr}
        catalogLabel={t('nav.catalog')}
        isSignedIn={!!user}
      />
    </header>
  );
}

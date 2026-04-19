import { getTranslations } from 'next-intl/server';
import { ShoppingBag, User, LogIn } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CategoryMenu } from '@/components/category-menu';
import { HeaderSearch } from '@/components/header-search';
import { MobileNav } from '@/components/mobile-nav';
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

  const rows = await prisma.category.findMany({
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
  const flat: FlatCategory<TopCategory>[] = rows.map((r) => ({ ...r }));
  const tree = buildTree(flat);
  const topCategories = tree.slice(0, 6);

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

  const allOf = (label: string) => (isAr ? `كل ${label}` : `All ${label}`);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-4">
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
            cart: t('nav.cart'),
            language: t('common.languageSwitcher'),
            business: isAr ? 'للشركات' : 'For Business',
            allOf,
          }}
        />

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink text-canvas">
            <span className="text-sm font-bold">PF</span>
          </span>
          <span className="hidden sm:inline">{t('brand.name')}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link
            href="/products"
            className="font-medium text-foreground transition-colors hover:text-accent-strong"
          >
            {t('nav.catalog')}
          </Link>
          <CategoryMenu
            allLabel={isAr ? 'كل' : 'All'}
            categories={mobileCategories}
          />
        </nav>

        <div className="hidden flex-1 justify-center md:flex">
          <HeaderSearch locale={headerLocale} />
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1 md:ms-0 md:gap-2">
          <LanguageSwitcher className="hidden lg:flex" />

          <Link
            href="/cart"
            className="relative inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover sm:px-3"
            aria-label={t('nav.cart')}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">{t('nav.cart')}</span>
            {cartCount > 0 ? (
              <span
                className="num absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground sm:static sm:end-auto sm:top-auto sm:ms-0"
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
              href="/account"
              className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover sm:inline-flex"
            >
              <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span>{t('nav.account')}</span>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover sm:inline-flex"
            >
              <LogIn className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <HeaderSearch locale={headerLocale} />
      </div>
    </header>
  );
}

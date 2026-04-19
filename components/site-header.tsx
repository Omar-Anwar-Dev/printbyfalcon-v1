import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { CategoryMenu } from '@/components/category-menu';
import { HeaderSearch } from '@/components/header-search';
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
  const topCategories = tree.slice(0, 6); // header bar holds max 6 top-levels

  const headerLocale: 'ar' | 'en' = isAr ? 'ar' : 'en';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold"
        >
          <span className="text-lg">{t('brand.name')}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link href="/" className="hover:text-primary">
            {t('nav.home')}
          </Link>
          <Link href="/products" className="hover:text-primary">
            {t('nav.catalog')}
          </Link>
          <CategoryMenu
            allLabel={isAr ? 'كل' : 'All'}
            categories={topCategories.map((cat) => ({
              id: cat.id,
              slug: cat.slug,
              label: isAr ? cat.nameAr : cat.nameEn,
              children: cat.children.map((child) => ({
                id: child.id,
                slug: child.slug,
                label: isAr ? child.nameAr : child.nameEn,
              })),
            }))}
          />
        </nav>

        <div className="hidden flex-1 justify-center md:flex">
          <HeaderSearch locale={headerLocale} />
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/cart"
            className="relative text-sm text-muted-foreground hover:text-foreground"
            aria-label={t('nav.cart')}
          >
            {t('nav.cart')}
            {cartCount > 0 ? (
              <span className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>
          {user ? (
            <Link
              href="/account"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('nav.account')}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
      <div className="container pb-2 md:hidden">
        <HeaderSearch locale={headerLocale} />
      </div>
    </header>
  );
}

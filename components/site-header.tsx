import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getOptionalUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { buildTree, type FlatCategory } from '@/lib/catalog/category-tree';

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

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">{t('brand.name')}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link href="/" className="hover:text-primary">
            {t('nav.home')}
          </Link>
          <Link href="/products" className="hover:text-primary">
            {t('nav.catalog')}
          </Link>
          {topCategories.map((cat) => (
            <details key={cat.id} className="group relative">
              <summary className="cursor-pointer list-none hover:text-primary">
                {isAr ? cat.nameAr : cat.nameEn}
              </summary>
              <div className="absolute start-0 top-full z-50 mt-2 hidden min-w-[200px] rounded-md border bg-background p-2 shadow-md group-open:block">
                <Link
                  href={`/categories/${cat.slug}`}
                  className="block rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  {isAr ? 'كل ' : 'All '}
                  {isAr ? cat.nameAr : cat.nameEn}
                </Link>
                {cat.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="block rounded px-3 py-2 text-sm hover:bg-muted"
                  >
                    {isAr ? child.nameAr : child.nameEn}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
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
    </header>
  );
}

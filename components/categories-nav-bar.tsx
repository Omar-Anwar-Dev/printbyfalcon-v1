'use client';

import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

type Category = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
};

type Props = {
  categories: Category[];
  isAr: boolean;
  catalogLabel: string;
  isSignedIn: boolean;
};

/**
 * Categories nav (Bar 2) — only renders on the storefront browsing surfaces:
 *   /              (home)
 *   /products      + any subroute
 *   /categories/*  + any subroute
 *   /search
 *
 * Hidden on /admin, /account, /cart, /checkout, /b2b, /sign-in, /b2b/login,
 * /privacy, /terms, /cookies, /order, /payments, /invoices — anywhere the
 * visitor is mid-task and a 2nd nav strip is just clutter.
 */
const BROWSING_PATHS = /^\/(?:products|categories|search)(?:\/|$)/;

export function CategoriesNavBar({
  categories,
  isAr,
  catalogLabel,
  isSignedIn,
}: Props) {
  const pathname = usePathname();
  // Strip the locale prefix before testing.
  const stripped = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';
  const onBrowsingSurface = stripped === '/' || BROWSING_PATHS.test(stripped);
  if (!onBrowsingSurface) return null;

  return (
    <div className="hidden border-b border-border bg-background md:block">
      <nav
        aria-label={isAr ? 'الفئات' : 'Categories'}
        className="container-page relative"
      >
        <ul className="flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <Link
              href="/products"
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-foreground transition-colors hover:text-accent-strong"
            >
              {catalogLabel}
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/categories/${cat.slug}`}
                className="inline-flex h-11 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {isAr ? cat.nameAr : cat.nameEn}
              </Link>
            </li>
          ))}
          <li className="ms-auto">
            {!isSignedIn ? (
              <Link
                href="/b2b/register"
                className="inline-flex h-11 items-center gap-1.5 px-3 text-sm font-medium text-accent-strong transition-colors hover:text-accent"
              >
                <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {isAr ? 'سجّل شركتك' : 'Register your business'}
              </Link>
            ) : null}
          </li>
        </ul>
      </nav>
    </div>
  );
}

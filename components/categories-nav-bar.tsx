'use client';

import { usePathname } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

type CategoryChild = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
};

type Category = CategoryChild & {
  children?: CategoryChild[];
};

type Props = {
  categories: Category[];
  isAr: boolean;
  catalogLabel: string;
  isSignedIn: boolean;
  allLabel: string;
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
 *
 * Top-level categories with children open a hover-triggered dropdown showing
 * immediate children + an "All <category>" shortcut. The trigger itself is
 * still a Link, so a click navigates to the parent category page (which then
 * aggregates products from the parent + every descendant).
 *
 * The hover behaviour is pure CSS (`group-hover` + `focus-within`) so there
 * is no client-state needed. On touch-only devices hover never fires and the
 * dropdown stays hidden — fine, because Bar 2 is `hidden md:block` and the
 * MobileNav already handles category browsing on narrow viewports.
 */
const BROWSING_PATHS = /^\/(?:products|categories|search)(?:\/|$)/;

export function CategoriesNavBar({
  categories,
  isAr,
  catalogLabel,
  isSignedIn,
  allLabel,
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
        <ul className="flex h-11 items-center gap-1">
          <li className="shrink-0">
            <Link
              href="/products"
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-foreground transition-colors hover:text-accent-strong"
            >
              {catalogLabel}
            </Link>
          </li>
          {categories.map((cat) => {
            const label = isAr ? cat.nameAr : cat.nameEn;
            const hasChildren = !!cat.children && cat.children.length > 0;
            return (
              <li key={cat.id} className="group/cat relative shrink-0">
                <Link
                  href={`/categories/${cat.slug}`}
                  aria-haspopup={hasChildren ? 'menu' : undefined}
                  className="inline-flex h-11 items-center gap-1 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground group-focus-within/cat:text-foreground"
                >
                  <span>{label}</span>
                  {hasChildren ? (
                    <ChevronDown
                      className="h-3.5 w-3.5 opacity-60 transition-transform group-focus-within/cat:rotate-180 group-hover/cat:rotate-180"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                </Link>
                {hasChildren ? (
                  <div
                    role="menu"
                    aria-label={label}
                    className="invisible absolute start-0 top-full z-50 min-w-[220px] -translate-y-1 rounded-lg border border-border bg-canvas p-1.5 opacity-0 shadow-popover transition-[opacity,transform] duration-150 group-focus-within/cat:visible group-focus-within/cat:translate-y-0 group-focus-within/cat:opacity-100 group-hover/cat:visible group-hover/cat:translate-y-0 group-hover/cat:opacity-100"
                  >
                    <Link
                      role="menuitem"
                      href={`/categories/${cat.slug}`}
                      className="block rounded-md px-3 py-2 text-sm font-medium text-accent-strong hover:bg-accent-soft focus:bg-accent-soft focus:outline-none"
                    >
                      {allLabel} {label}
                    </Link>
                    {cat.children!.map((child) => (
                      <Link
                        role="menuitem"
                        key={child.id}
                        href={`/categories/${child.slug}`}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-paper-hover focus:bg-paper-hover focus:outline-none"
                      >
                        {isAr ? child.nameAr : child.nameEn}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
          <li className="ms-auto shrink-0">
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

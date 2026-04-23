'use client';

import { useEffect, useState } from 'react';
import {
  Menu,
  X,
  Home,
  Package,
  ShoppingBag,
  User,
  Globe,
  ChevronDown,
  LogIn,
  Building2,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

type NavCategory = {
  id: string;
  slug: string;
  label: string;
  children: Array<{ id: string; slug: string; label: string }>;
};

type Labels = {
  openMenu: string;
  closeMenu: string;
  home: string;
  catalog: string;
  categoriesHeading: string;
  accountHeading: string;
  account: string;
  login: string;
  cart: string;
  language: string;
  business: string;
  allLabel: string;
};

/**
 * Mobile nav — Sprint 11 ADR-059 update.
 *
 * Changes from the foundation pass:
 *   - Hamburger trigger restyled for the dark ink header (canvas-on-transparent hover).
 *   - Panel slides in from the **end** side (left in RTL / right in LTR) — matches Egyptian
 *     e-commerce convention (Raya, Noon). Previously slid from start.
 *   - Panel narrower (80%, max 320px) so the site context behind it stays partially visible.
 */
export function MobileNav({
  categories,
  isSignedIn,
  cartCount,
  labels,
  otherLocale,
  otherLocaleHref,
  otherLocaleLabel,
}: {
  categories: NavCategory[];
  isSignedIn: boolean;
  cartCount: number;
  labels: Labels;
  otherLocale: string;
  otherLocaleHref: string;
  otherLocaleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setExpanded(null);
  };

  return (
    <>
      <button
        type="button"
        aria-label={labels.openMenu}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-canvas transition-colors hover:bg-canvas/10 md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={labels.openMenu}
        >
          <div
            className="absolute inset-0 animate-fade-in bg-ink/50"
            onClick={close}
            aria-hidden
          />
          <div
            id="mobile-nav-panel"
            className="absolute inset-y-0 end-0 flex h-full w-[80%] max-w-[320px] animate-slide-in-end flex-col bg-background shadow-popover"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-base font-semibold text-foreground">
                {labels.openMenu}
              </span>
              <button
                type="button"
                aria-label={labels.closeMenu}
                onClick={close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav
              className="flex-1 overflow-y-auto overscroll-contain"
              aria-label={labels.openMenu}
            >
              <ul className="flex flex-col py-2">
                <li>
                  <Link
                    href="/"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-paper-hover"
                  >
                    <Home
                      className="h-5 w-5 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    {labels.home}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-paper-hover"
                  >
                    <Package
                      className="h-5 w-5 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    {labels.catalog}
                  </Link>
                </li>
              </ul>

              {categories.length > 0 ? (
                <>
                  <div className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {labels.categoriesHeading}
                  </div>
                  <ul className="flex flex-col pb-2">
                    {categories.map((cat) => {
                      const isExpanded = expanded === cat.id;
                      const hasChildren = cat.children.length > 0;
                      return (
                        <li key={cat.id}>
                          <div className="flex items-center">
                            <Link
                              href={`/categories/${cat.slug}`}
                              onClick={close}
                              className="flex-1 px-4 py-3 text-base text-foreground hover:bg-paper-hover"
                            >
                              {cat.label}
                            </Link>
                            {hasChildren ? (
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-label={`${cat.label} — ${labels.categoriesHeading}`}
                                onClick={() =>
                                  setExpanded(isExpanded ? null : cat.id)
                                }
                                className="me-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-paper-hover"
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-base ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  strokeWidth={1.75}
                                />
                              </button>
                            ) : null}
                          </div>
                          {hasChildren && isExpanded ? (
                            <ul className="ms-6 flex flex-col border-s-2 border-border">
                              <li>
                                <Link
                                  href={`/categories/${cat.slug}`}
                                  onClick={close}
                                  className="block px-4 py-2 text-sm text-muted-foreground hover:bg-paper-hover hover:text-foreground"
                                >
                                  {labels.allLabel} {cat.label}
                                </Link>
                              </li>
                              {cat.children.map((child) => (
                                <li key={child.id}>
                                  <Link
                                    href={`/categories/${child.slug}`}
                                    onClick={close}
                                    className="block px-4 py-2 text-sm text-muted-foreground hover:bg-paper-hover hover:text-foreground"
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              <div className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {labels.accountHeading}
              </div>
              <ul className="flex flex-col pb-4">
                <li>
                  <Link
                    href="/cart"
                    onClick={close}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-paper-hover"
                  >
                    <span className="flex items-center gap-3">
                      <ShoppingBag
                        className="h-5 w-5 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      {labels.cart}
                    </span>
                    {cartCount > 0 ? (
                      <span className="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-xs font-semibold text-accent-foreground">
                        {cartCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
                {isSignedIn ? (
                  <li>
                    <Link
                      href="/account"
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-paper-hover"
                    >
                      <User
                        className="h-5 w-5 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      {labels.account}
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link
                      href="/sign-in"
                      onClick={close}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-paper-hover"
                    >
                      <LogIn
                        className="h-5 w-5 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      {labels.login}
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/b2b/login"
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-paper-hover hover:text-foreground"
                  >
                    <Building2 className="h-5 w-5" strokeWidth={1.75} />
                    {labels.business}
                  </Link>
                </li>
              </ul>

              <div className="border-t border-border p-4">
                <a
                  href={otherLocaleHref}
                  hrefLang={otherLocale}
                  onClick={close}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-paper-hover"
                >
                  <Globe
                    className="h-5 w-5 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className="text-muted-foreground">
                    {labels.language}:
                  </span>
                  <span className="font-medium">{otherLocaleLabel}</span>
                </a>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

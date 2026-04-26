'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { AdminNavIcon } from '@/components/admin/admin-nav-icon';
import type { AdminNavGroup } from '@/lib/admin/nav-config';

/**
 * Mobile drawer nav for the admin shell. Mirrors the storefront's
 * MobileNav: hamburger trigger in the topbar, slide-in panel from
 * the `end` side (left in RTL / right in LTR), 80% width / max 320px.
 *
 * Auto-closes when the route changes so the panel doesn't stay open
 * after navigating.
 */
export function AdminMobileNav({
  groups,
  labels,
}: {
  groups: AdminNavGroup[];
  labels: { open: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const stripped = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + close on Escape while open.
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

  return (
    <>
      <button
        type="button"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="admin-mobile-nav-panel"
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
          aria-label={labels.open}
        >
          <div
            className="absolute inset-0 animate-fade-in bg-ink/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id="admin-mobile-nav-panel"
            className="absolute inset-y-0 end-0 flex h-full w-[80%] max-w-[320px] animate-slide-in-end flex-col bg-background shadow-popover"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-base font-semibold text-foreground">
                {labels.open}
              </span>
              <button
                type="button"
                aria-label={labels.close}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav
              aria-label="Admin navigation"
              className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-3 py-5"
            >
              {groups.map((group, idx) => (
                <div
                  key={`${group.heading}-${idx}`}
                  className="flex flex-col gap-1"
                >
                  {group.heading ? (
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {group.heading}
                    </p>
                  ) : null}
                  {group.links.map((link) => {
                    const active = isActive(stripped, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={
                          active
                            ? 'flex items-center gap-3 rounded-md bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent-strong'
                            : 'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-paper-hover'
                        }
                      >
                        <AdminNavIcon name={link.icon} className="h-5 w-5" />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

function isActive(currentPath: string, linkHref: string): boolean {
  if (linkHref === '/admin') return currentPath === '/admin';
  return currentPath === linkHref || currentPath.startsWith(`${linkHref}/`);
}

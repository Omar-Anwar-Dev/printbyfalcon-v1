'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { AdminNavIcon } from '@/components/admin/admin-nav-icon';
import type { AdminNavGroup } from '@/lib/admin/nav-config';

/**
 * Desktop sidebar nav for the admin shell.
 * Reads the current pathname (locale-stripped) to highlight the active link.
 * Designed to live inside an `<aside class="hidden md:block">` slot.
 */
export function AdminSideNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname() ?? '/';
  // Strip locale prefix so /ar/admin/products and /admin/products both match.
  const stripped = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';

  return (
    <nav
      aria-label="Admin navigation"
      className="flex flex-col gap-5 px-3 py-5"
    >
      {groups.map((group, idx) => (
        <div key={`${group.heading}-${idx}`} className="flex flex-col gap-1">
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
                    ? 'flex items-center gap-2.5 rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent-strong'
                    : 'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground'
                }
              >
                <AdminNavIcon name={link.icon} className="h-4 w-4" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function isActive(currentPath: string, linkHref: string): boolean {
  if (linkHref === '/admin') return currentPath === '/admin';
  return currentPath === linkHref || currentPath.startsWith(`${linkHref}/`);
}

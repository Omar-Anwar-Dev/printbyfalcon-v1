'use client';

import { usePathname } from 'next/navigation';
import {
  Building,
  ListChecks,
  MapPin,
  Package,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

export type PortalTabIconName =
  | 'user'
  | 'map-pin'
  | 'building'
  | 'package'
  | 'list-checks';

export type PortalTab = {
  href: string;
  label: string;
  icon?: PortalTabIconName;
};

const ICONS: Record<PortalTabIconName, LucideIcon> = {
  user: User,
  'map-pin': MapPin,
  building: Building,
  package: Package,
  'list-checks': ListChecks,
};

/**
 * Horizontal tabs nav for user-facing portals (B2C account, B2B portal).
 * Full-bleed `<nav>` with a single bottom border; the inner list is
 * centered via `container-page` so it lines up with the page content
 * underneath. Scrolls horizontally on narrow viewports so a long tab
 * list never breaks the layout.
 *
 * Active tab is detected by `usePathname()` after stripping the locale
 * prefix.
 *
 * **Why icon names instead of component refs:** server layouts pass the
 * tabs payload across the server→client boundary, and Lucide icons are
 * regular React components (not Client References) — passing them
 * directly fails serialization at runtime in production builds. The
 * name → component mapping happens here, inside the client bundle.
 */
export function PortalTabs({
  tabs,
  ariaLabel,
}: {
  tabs: PortalTab[];
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? '/';
  const stripped = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, '') || '/';

  return (
    <nav aria-label={ariaLabel} className="border-b border-border bg-canvas">
      <div className="container-page">
        <ul className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = isActive(stripped, tab.href);
            const Icon = tab.icon ? ICONS[tab.icon] : null;
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'inline-flex items-center gap-2 border-b-2 border-accent px-3 py-3 text-sm font-semibold text-foreground'
                      : 'inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground'
                  }
                >
                  {Icon ? (
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  ) : null}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function isActive(currentPath: string, tabHref: string): boolean {
  return currentPath === tabHref || currentPath.startsWith(`${tabHref}/`);
}

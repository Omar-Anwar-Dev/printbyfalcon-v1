import type { ReactNode } from 'react';

/**
 * Reusable admin page header — Sprint 11 UI refiner Tier 3.
 *
 * Gives every admin surface the same overline + bold-H1 + subtitle pattern
 * the storefront uses, with an optional actions slot (create button, export
 * link, filters toggle, etc.). Keeps admin visually consistent across 30+
 * routes without per-page styling work.
 */
export function AdminPageHeader({
  overline,
  title,
  subtitle,
  meta,
  actions,
}: {
  overline?: string;
  title: string;
  subtitle?: ReactNode;
  /** Small inline metadata chips rendered under the title (role badge, count, etc.). */
  meta?: ReactNode;
  /** Right-side action cluster (CTA buttons, filter toggles). */
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {overline ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {overline}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

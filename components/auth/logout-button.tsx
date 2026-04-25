'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

type Variant = 'default' | 'subtle' | 'danger' | 'menu' | 'topbar';

const VARIANT_CLASS: Record<Variant, string> = {
  default:
    'inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-paper-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
  subtle:
    'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
  danger:
    'inline-flex h-10 items-center gap-2 rounded-md border border-error/30 bg-background px-4 text-sm font-medium text-error transition-colors hover:bg-error-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:opacity-50',
  menu: 'flex w-full items-center gap-3 px-4 py-3 text-base font-medium text-error transition-colors hover:bg-error-soft focus-visible:outline-none focus-visible:bg-error-soft disabled:opacity-50',
  topbar:
    'inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-canvas transition-colors hover:bg-canvas/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-50 sm:px-3',
};

type Props = {
  label: string;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
  showIcon?: boolean;
  children?: ReactNode;
};

/**
 * Logs out the current session and returns the visitor to the homepage.
 * Variants cover the common surfaces (storefront pages, mobile drawer, admin
 * topbar). Pass `children` for a fully custom layout.
 */
export function LogoutButton({
  label,
  pendingLabel,
  variant = 'default',
  className,
  showIcon = true,
  children,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await logoutAction();
      router.push('/');
      router.refresh();
    });
  }

  const finalClass = className ?? VARIANT_CLASS[variant];
  const visibleLabel = pending && pendingLabel ? pendingLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className={finalClass}
    >
      {children ?? (
        <>
          {showIcon ? (
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          ) : null}
          <span>{visibleLabel}</span>
        </>
      )}
    </button>
  );
}

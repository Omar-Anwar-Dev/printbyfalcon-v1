'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'warning' | 'error';

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = ToastOptions & { id: string; createdAt: number };

type ToastContextValue = {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Dependency-free toast system. One `<ToastProvider>` mounted high in the tree
 * (see app/[locale]/layout.tsx). Any client component can call `useToast()` to
 * push notifications. Auto-dismiss after 4s by default; durable by passing
 * `durationMs: Infinity`. Position is top-end (RTL-safe via logical props).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions): string => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [
      ...current,
      { ...opts, id, createdAt: Date.now() },
    ]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

/* ─────────────────────────────── Toaster ───────────────────────────────── */

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-border',
  success: 'border-success/30',
  warning: 'border-warning/30',
  error: 'border-error/30',
};

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  default: 'text-accent-strong',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed end-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:end-6 sm:top-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const variant = toast.variant ?? 'default';
  const duration = toast.durationMs ?? 4000;

  useEffect(() => {
    if (!isFinite(duration)) return;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-lg border bg-canvas p-4 shadow-popover ${VARIANT_STYLES[variant]}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${VARIANT_ICON_COLOR[variant]}`}
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-paper-hover hover:text-foreground"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

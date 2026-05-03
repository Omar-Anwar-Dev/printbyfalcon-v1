'use client';

/**
 * Sprint 12 — Whats360 device health widget on /admin home.
 *
 * Polls `getWhats360DeviceStatusAction` every 60 s. Renders three states:
 *   - connected (green) — device is online, all good
 *   - disconnected (red) — device offline; owner must rescan QR
 *   - probe error (amber) — Whats360 API unreachable or returned an error
 *
 * Why a widget and not just an alert: ADR-063 collapses all WhatsApp traffic
 * onto a single device, so visible "device is up" feedback is operational
 * comfort that the daily monitoring playbook (docs/daily-monitoring.md) leans
 * on. The widget shows on the admin home page for OWNER + OPS roles.
 */
import { useEffect, useState, useTransition } from 'react';
import {
  getWhats360DeviceStatusAction,
  type Whats360StatusResult,
} from '@/app/actions/admin-whats360';

type Tone = 'connected' | 'disconnected' | 'error' | 'loading';

const POLL_INTERVAL_MS = 60_000;

export function Whats360StatusWidget({ isAr }: { isAr: boolean }) {
  const [result, setResult] = useState<Whats360StatusResult | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    function run() {
      startTransition(async () => {
        const r = await getWhats360DeviceStatusAction();
        if (!cancelled) setResult(r);
      });
    }

    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const tone: Tone = !result
    ? 'loading'
    : !result.ok
      ? 'error'
      : result.status.connected
        ? 'connected'
        : result.status.error === 'missing_config'
          ? 'error'
          : 'disconnected';

  const label = (() => {
    if (tone === 'loading')
      return isAr ? 'فحص حالة الجهاز…' : 'Checking device…';
    if (tone === 'connected')
      return isAr ? 'جهاز واتساب متصل' : 'WhatsApp device connected';
    if (tone === 'disconnected')
      return isAr ? 'جهاز واتساب غير متصل' : 'WhatsApp device offline';
    return isAr ? 'تعذّر فحص جهاز واتساب' : 'WhatsApp probe failed';
  })();

  const detail = (() => {
    if (!result || !result.ok) {
      return isAr
        ? 'تعذّر الوصول إلى Whats360. ارجع إلى وقت إعداد البيانات الحساسة.'
        : 'Could not reach Whats360. Check WHATS360_TOKEN / WHATS360_INSTANCE_ID.';
    }
    if (result.status.connected) {
      return isAr
        ? 'الجهاز نشط ويستقبل الرسائل.'
        : 'Device is active and receiving messages.';
    }
    if (result.status.error === 'missing_config') {
      return isAr
        ? 'لم يتم تهيئة WHATS360_TOKEN أو WHATS360_INSTANCE_ID.'
        : 'WHATS360_TOKEN / WHATS360_INSTANCE_ID not configured.';
    }
    return isAr
      ? 'افتح Whats360 وأعد مسح رمز QR على هاتف الخط الرئيسي.'
      : 'Open Whats360 and rescan the QR code on the line device.';
  })();

  const palette: Record<Tone, { dot: string; pill: string; text: string }> = {
    connected: {
      dot: 'bg-success',
      pill: 'border-success/30 bg-success-soft',
      text: 'text-success',
    },
    disconnected: {
      dot: 'bg-error',
      pill: 'border-error/30 bg-error-soft',
      text: 'text-error',
    },
    error: {
      dot: 'bg-warning',
      pill: 'border-warning/30 bg-warning-soft',
      text: 'text-warning',
    },
    loading: {
      dot: 'bg-muted-foreground',
      pill: 'border-border bg-paper',
      text: 'text-muted-foreground',
    },
  };
  const c = palette[tone];

  const checkedAt = result && result.ok ? new Date(result.checkedAt) : null;
  const checkedLabel =
    checkedAt && !Number.isNaN(checkedAt.getTime())
      ? checkedAt.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${c.pill}`}
      aria-live="polite"
    >
      <span
        aria-hidden
        className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.dot} ${
          tone === 'loading' ? 'animate-pulse' : ''
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${c.text}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
        {checkedLabel ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isAr
              ? `آخر فحص: ${checkedLabel}`
              : `Last checked: ${checkedLabel}`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

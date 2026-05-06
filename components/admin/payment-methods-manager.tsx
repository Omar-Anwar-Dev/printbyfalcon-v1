'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Lock, ShieldCheck, FlaskConical } from 'lucide-react';
import {
  togglePaymentMethodAction,
  setPaymentModeAction,
} from '@/app/actions/admin-payment';
import type { PaymentMode, PaymentMethodView } from '@/lib/settings/payment';

type Method = PaymentMethodView & { envMissing: boolean };

type Props = {
  locale: 'ar' | 'en';
  methods: Method[];
  mode: PaymentMode;
};

export function PaymentMethodsManager({
  locale,
  methods: initial,
  mode: initialMode,
}: Props) {
  const isAr = locale === 'ar';
  const [methods, setMethods] = useState<Method[]>(initial);
  const [mode, setMode] = useState<PaymentMode>(initialMode);
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Toggle dialog state — captures password from owner before flipping.
  const [pendingToggle, setPendingToggle] = useState<{
    code: string;
    nextEnabled: boolean;
  } | null>(null);
  const [pendingMode, setPendingMode] = useState<PaymentMode | null>(null);
  const [password, setPassword] = useState('');

  function flash(kind: 'ok' | 'err', text: string) {
    setStatusMsg({ kind, text });
    setTimeout(() => setStatusMsg(null), 3500);
  }

  function startToggle(code: string, nextEnabled: boolean) {
    setPendingToggle({ code, nextEnabled });
    setPassword('');
  }

  function startModeChange(next: PaymentMode) {
    if (next === mode) return;
    setPendingMode(next);
    setPassword('');
  }

  function cancelDialog() {
    setPendingToggle(null);
    setPendingMode(null);
    setPassword('');
  }

  function confirmToggle() {
    if (!pendingToggle) return;
    const target = pendingToggle;
    startTransition(async () => {
      const r = await togglePaymentMethodAction({
        code: target.code,
        enabled: target.nextEnabled,
        password,
      });
      if (!r.ok) {
        flash('err', errMsg(r, isAr));
        if (r.errorKey === 'admin_password.rate_limited') {
          // Force-close so the owner sees the cooldown notice and tries later.
          cancelDialog();
        }
        return;
      }
      setMethods((prev) =>
        prev.map((m) =>
          m.code === target.code ? { ...m, enabled: target.nextEnabled } : m,
        ),
      );
      flash(
        'ok',
        isAr
          ? `تم ${target.nextEnabled ? 'تفعيل' : 'تعطيل'} طريقة الدفع`
          : `Method ${target.nextEnabled ? 'enabled' : 'disabled'}`,
      );
      cancelDialog();
    });
  }

  function confirmModeChange() {
    if (!pendingMode) return;
    const target = pendingMode;
    startTransition(async () => {
      const r = await setPaymentModeAction({ mode: target, password });
      if (!r.ok) {
        flash('err', errMsg(r, isAr));
        if (r.errorKey === 'admin_password.rate_limited') {
          cancelDialog();
        }
        return;
      }
      setMode(target);
      flash(
        'ok',
        isAr
          ? `تم تبديل وضع الدفع إلى ${target === 'LIVE' ? 'الحقيقي' : 'التجريبي'}`
          : `Payment mode switched to ${target}`,
      );
      cancelDialog();
    });
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            statusMsg.kind === 'ok'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Mode card */}
      <section
        className={`rounded-xl border p-5 ${
          mode === 'LIVE'
            ? 'border-success/40 bg-success/5'
            : 'border-warning/40 bg-warning/5'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {mode === 'LIVE' ? (
                <ShieldCheck className="h-5 w-5 text-success" />
              ) : (
                <FlaskConical className="h-5 w-5 text-warning" />
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {isAr
                  ? mode === 'LIVE'
                    ? 'وضع الدفع الحقيقي مُفعَّل'
                    : 'وضع الدفع التجريبي مُفعَّل'
                  : mode === 'LIVE'
                    ? 'Live payment mode'
                    : 'Test payment mode'}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAr
                ? mode === 'LIVE'
                  ? 'الطلبات تُعالَج عبر حساب Paymob الفعلي وتُسحب من بطاقة العميل فعلياً.'
                  : 'الطلبات تُعالَج عبر حساب Paymob التجريبي ولا يتم سحب أي مبالغ. مناسب لاختبار التدفق فقط.'
                : mode === 'LIVE'
                  ? 'Orders are processed against the real Paymob merchant account and customer cards are actually charged.'
                  : 'Orders are processed against the Paymob sandbox; no real money moves. For flow testing only.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={mode === 'LIVE' || pending}
              onClick={() => startModeChange('LIVE')}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === 'LIVE'
                  ? 'bg-success/20 text-success'
                  : 'border border-border bg-background text-foreground hover:bg-paper-hover'
              }`}
            >
              LIVE
            </button>
            <button
              type="button"
              disabled={mode === 'TEST' || pending}
              onClick={() => startModeChange('TEST')}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                mode === 'TEST'
                  ? 'bg-warning/20 text-warning'
                  : 'border border-border bg-background text-foreground hover:bg-paper-hover'
              }`}
            >
              TEST
            </button>
          </div>
        </div>
      </section>

      {/* Methods list */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'طرق الدفع المتاحة' : 'Available methods'}
        </h2>
        <ul className="space-y-2">
          {methods.map((m) => (
            <li
              key={m.code}
              className={`rounded-xl border p-4 ${
                m.enabled
                  ? 'border-border bg-paper'
                  : 'border-border/40 bg-muted/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {isAr ? m.nameAr : m.nameEn}
                    </h3>
                    {!m.enabled && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {isAr ? 'موقوف' : 'Disabled'}
                      </span>
                    )}
                    {m.envMissing && m.enabled && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-xs text-error"
                        title={
                          isAr
                            ? 'المفاتيح المطلوبة غير موجودة في env'
                            : 'Required env keys missing'
                        }
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {isAr ? 'env ناقص' : 'env missing'}
                      </span>
                    )}
                  </div>
                  {(isAr ? m.descriptionAr : m.descriptionEn) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isAr ? m.descriptionAr : m.descriptionEn}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {m.code}
                    {m.paymobIntegrationKind && ` · ${m.paymobIntegrationKind}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startToggle(m.code, !m.enabled)}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    m.enabled
                      ? 'border border-error/30 bg-background text-error hover:bg-error/10'
                      : 'bg-accent text-accent-foreground hover:bg-accent/90'
                  } disabled:opacity-50`}
                >
                  {m.enabled
                    ? isAr
                      ? 'تعطيل'
                      : 'Disable'
                    : isAr
                      ? 'تفعيل'
                      : 'Enable'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Password dialog */}
      {(pendingToggle || pendingMode) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={cancelDialog}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent-strong" />
              <h3 className="font-semibold text-foreground">
                {isAr ? 'تأكيد بكلمة المرور' : 'Confirm with password'}
              </h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {pendingToggle
                ? isAr
                  ? `سيتم ${pendingToggle.nextEnabled ? 'تفعيل' : 'تعطيل'} طريقة الدفع المختارة. أدخل كلمة مرور الـ admin للمتابعة.`
                  : `${pendingToggle.nextEnabled ? 'Enabling' : 'Disabling'} the selected payment method. Enter your admin password to continue.`
                : isAr
                  ? `سيتم تبديل وضع الدفع إلى ${pendingMode === 'LIVE' ? 'الحقيقي' : 'التجريبي'}. أدخل كلمة مرور الـ admin للمتابعة.`
                  : `Switching payment mode to ${pendingMode}. Enter your admin password to continue.`}
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (pendingToggle) confirmToggle();
                  if (pendingMode) confirmModeChange();
                }
                if (e.key === 'Escape') cancelDialog();
              }}
              placeholder={isAr ? 'كلمة المرور' : 'Admin password'}
              className="block w-full rounded border border-border bg-paper px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDialog}
                disabled={pending}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-paper-hover"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={pendingToggle ? confirmToggle : confirmModeChange}
                disabled={pending || password.length === 0}
                className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function errMsg(
  r: {
    errorKey: string;
    retryAfterSeconds?: number;
    remainingAttempts?: number;
  },
  isAr: boolean,
): string {
  const key = r.errorKey;
  const attemptsTail =
    r.remainingAttempts !== undefined
      ? isAr
        ? ` (متبقّي ${r.remainingAttempts} محاولات)`
        : ` (${r.remainingAttempts} attempts left)`
      : '';
  const map: Record<string, { ar: string; en: string }> = {
    'admin_password.empty': {
      ar: 'كلمة المرور مطلوبة',
      en: 'Password is required',
    },
    'admin_password.mismatch': {
      ar: 'كلمة المرور خطأ',
      en: 'Wrong password',
    },
    'admin_password.no_password': {
      ar: 'تعذّر التحقّق من الحساب',
      en: 'Account verification failed',
    },
    'admin_password.rate_limited': {
      ar: r.retryAfterSeconds
        ? `تم تجاوز الحد المسموح. حاول بعد ${Math.ceil(r.retryAfterSeconds / 60)} دقيقة.`
        : 'تم تجاوز الحد المسموح. حاول لاحقاً.',
      en: r.retryAfterSeconds
        ? `Too many attempts. Try again in ${Math.ceil(r.retryAfterSeconds / 60)} minute(s).`
        : 'Too many attempts. Try again later.',
    },
    'validation.failed': {
      ar: 'البيانات غير صحيحة',
      en: 'Invalid input',
    },
    'payment.method_not_found': {
      ar: 'طريقة الدفع غير موجودة',
      en: 'Payment method not found',
    },
    'settings.update_failed': {
      ar: 'فشل العملية، حاول مرة أخرى',
      en: 'Operation failed, please retry',
    },
  };
  const entry = map[key];
  const base = entry
    ? isAr
      ? entry.ar
      : entry.en
    : isAr
      ? 'حدث خطأ'
      : 'Error';
  if (key === 'admin_password.mismatch') return base + attemptsTail;
  return base;
}

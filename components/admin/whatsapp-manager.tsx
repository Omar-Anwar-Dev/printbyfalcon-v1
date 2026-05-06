'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Send,
  Wifi,
  ShieldCheck,
  FlaskConical,
  PauseCircle,
} from 'lucide-react';
import {
  setWhatsappModeAction,
  checkWhatsappStatusAction,
  sendWhatsappTestMessageAction,
} from '@/app/actions/admin-whatsapp';
import type { WhatsappMode } from '@/lib/settings/whatsapp';

type EnvState = {
  tokenSet: boolean;
  instanceSet: boolean;
  webhookSecretSet: boolean;
  devModeEnv: boolean;
  sandboxEnv: boolean;
};

type Props = {
  locale: 'ar' | 'en';
  mode: WhatsappMode;
  envState: EnvState;
};

const MODE_OPTIONS: WhatsappMode[] = ['LIVE', 'SANDBOX', 'DEV'];

export function WhatsappManager({
  locale,
  mode: initialMode,
  envState,
}: Props) {
  const isAr = locale === 'ar';
  const [mode, setMode] = useState<WhatsappMode>(initialMode);
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [pendingMode, setPendingMode] = useState<WhatsappMode | null>(null);
  const [password, setPassword] = useState('');

  const [deviceStatus, setDeviceStatus] = useState<{
    connected: boolean;
    raw?: unknown;
  } | null>(null);

  const [testPhone, setTestPhone] = useState('');

  function flash(kind: 'ok' | 'err', text: string) {
    setStatusMsg({ kind, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  function startModeChange(next: WhatsappMode) {
    if (next === mode) return;
    setPendingMode(next);
    setPassword('');
  }

  function cancelDialog() {
    setPendingMode(null);
    setPassword('');
  }

  function confirmModeChange() {
    if (!pendingMode) return;
    const target = pendingMode;
    startTransition(async () => {
      const r = await setWhatsappModeAction({ mode: target, password });
      if (!r.ok) {
        flash('err', errMsg(r, isAr));
        if (r.errorKey === 'admin_password.rate_limited') cancelDialog();
        return;
      }
      setMode(target);
      flash(
        'ok',
        isAr
          ? `تم تبديل وضع الواتساب إلى ${labelMode(target, isAr)}`
          : `WhatsApp mode set to ${target}`,
      );
      cancelDialog();
    });
  }

  function checkStatus() {
    setDeviceStatus(null);
    startTransition(async () => {
      const r = await checkWhatsappStatusAction();
      if (!r.ok) {
        flash('err', isAr ? 'فشل التحقق' : 'Check failed');
        return;
      }
      setDeviceStatus(r.data);
    });
  }

  function sendTest() {
    if (testPhone.trim().length < 6) {
      flash('err', isAr ? 'أدخل رقم هاتف صحيح' : 'Enter a valid phone');
      return;
    }
    startTransition(async () => {
      const r = await sendWhatsappTestMessageAction({ phone: testPhone });
      if (!r.ok) {
        flash(
          'err',
          isAr
            ? `فشل الإرسال: ${r.detail ?? errMsg(r, isAr)}`
            : `Send failed: ${r.detail ?? errMsg(r, isAr)}`,
        );
        return;
      }
      flash(
        'ok',
        isAr
          ? `تم الإرسال — id: ${r.data.externalMessageId ?? 'N/A'}`
          : `Sent — id: ${r.data.externalMessageId ?? 'N/A'}`,
      );
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

      {/* Env state */}
      <section className="rounded-xl border border-border bg-paper p-4 text-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          {isAr ? 'حالة المفاتيح في env' : 'Env keys status'}
        </h2>
        <ul className="space-y-1.5">
          <EnvRow
            ok={envState.tokenSet}
            label={isAr ? 'WHATS360_TOKEN' : 'WHATS360_TOKEN'}
            isAr={isAr}
          />
          <EnvRow
            ok={envState.instanceSet}
            label={isAr ? 'WHATS360_INSTANCE_ID' : 'WHATS360_INSTANCE_ID'}
            isAr={isAr}
          />
          <EnvRow
            ok={envState.webhookSecretSet}
            label={isAr ? 'WHATS360_WEBHOOK_SECRET' : 'WHATS360_WEBHOOK_SECRET'}
            isAr={isAr}
          />
        </ul>
        {(envState.devModeEnv || envState.sandboxEnv) && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            {isAr
              ? 'هناك متغيّر env يفرض الوضع (NOTIFICATIONS_DEV_MODE أو WHATS360_SANDBOX) — التغيير من DB لن يؤثر حتى تُزيله.'
              : 'An env override is forcing mode (NOTIFICATIONS_DEV_MODE or WHATS360_SANDBOX). DB mode is ignored until you remove it.'}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {isAr
            ? 'لتدوير المفاتيح أو تغييرها: راجع docs/whats360-key-rotation.md.'
            : 'To rotate or change keys: see docs/whats360-key-rotation.md.'}
        </p>
      </section>

      {/* Mode card */}
      <section className="rounded-xl border border-border bg-paper p-5">
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'وضع الإرسال' : 'Transport mode'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? modeCopy(mode, isAr) : modeCopy(mode, isAr)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={mode === m || pending}
              onClick={() => startModeChange(m)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold ${
                mode === m
                  ? m === 'LIVE'
                    ? 'bg-success/20 text-success'
                    : m === 'SANDBOX'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-muted text-muted-foreground'
                  : 'border border-border bg-background text-foreground hover:bg-paper-hover'
              }`}
            >
              {m === 'LIVE' && <ShieldCheck className="h-3 w-3" />}
              {m === 'SANDBOX' && <FlaskConical className="h-3 w-3" />}
              {m === 'DEV' && <PauseCircle className="h-3 w-3" />}
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Test connection */}
      <section className="rounded-xl border border-border bg-paper p-5">
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'اختبار الاتصال' : 'Test connection'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? 'يستعلم عن حالة الجهاز في Whats360 — مفيد للتحقق من أن الموبايل لا يزال مرتبطاً.'
            : 'Pings Whats360 for the device connection state — verifies the linked phone is still online.'}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={checkStatus}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <Wifi className="h-3.5 w-3.5" />
            {isAr ? 'افحص الآن' : 'Check now'}
          </button>
          {deviceStatus && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                deviceStatus.connected
                  ? 'bg-success/15 text-success'
                  : 'bg-error/10 text-error'
              }`}
            >
              {deviceStatus.connected ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {deviceStatus.connected
                ? isAr
                  ? 'الجهاز متصل'
                  : 'Device connected'
                : isAr
                  ? 'الجهاز غير متصل'
                  : 'Device disconnected'}
            </span>
          )}
        </div>
        {deviceStatus?.raw !== undefined && deviceStatus.raw !== null && (
          <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted/40 p-2 text-xs text-muted-foreground">
            {JSON.stringify(deviceStatus.raw, null, 2)}
          </pre>
        )}
      </section>

      {/* Test send */}
      <section className="rounded-xl border border-border bg-paper p-5">
        <h2 className="text-base font-semibold text-foreground">
          {isAr ? 'إرسال رسالة اختبار' : 'Send test message'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? 'يرسل رسالة قصيرة بعنوان وقت الإرسال. في وضع DEV/SANDBOX لن تصل فعلياً، لكن ستُسجَّل العملية.'
            : 'Sends a short timestamp message. In DEV/SANDBOX modes nothing reaches the recipient, but the call is logged.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="tel"
            placeholder={isAr ? '01XXXXXXXXX أو +201XXXXXXXXX' : 'Phone'}
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="w-64 rounded border border-border bg-background px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isAr ? 'أرسل' : 'Send'}
          </button>
        </div>
      </section>

      {/* Password dialog */}
      {pendingMode && (
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
              {isAr
                ? `سيتم تبديل وضع الواتساب إلى ${labelMode(pendingMode, true)}. أدخل كلمة مرور الـ admin للمتابعة.`
                : `Switching WhatsApp mode to ${pendingMode}. Enter your admin password to continue.`}
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmModeChange();
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
                onClick={confirmModeChange}
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

function EnvRow({
  ok,
  label,
  isAr,
}: {
  ok: boolean;
  label: string;
  isAr: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded border border-border bg-background px-3 py-1.5 text-xs">
      <span className="font-mono text-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 ${
          ok ? 'text-success' : 'text-error'
        }`}
      >
        {ok ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )}
        {ok ? (isAr ? 'مضبوط' : 'Set') : isAr ? 'فارغ' : 'Missing'}
      </span>
    </li>
  );
}

function labelMode(m: WhatsappMode, isAr: boolean): string {
  if (m === 'LIVE') return isAr ? 'الحقيقي' : 'live';
  if (m === 'SANDBOX') return isAr ? 'التجريبي' : 'sandbox';
  return isAr ? 'المُعطَّل (DEV)' : 'dev (off)';
}

function modeCopy(m: WhatsappMode, isAr: boolean): string {
  if (m === 'LIVE') {
    return isAr
      ? 'الإرسال يتم عبر API الفعلي للجهاز المرتبط بـ Whats360. الرسائل تصل للعملاء فعلياً.'
      : 'Messages are sent through the live device linked to Whats360. Customers receive them.';
  }
  if (m === 'SANDBOX') {
    return isAr
      ? 'الإرسال يستخدم endpoint التجريبي (sandbox=true). المكالمات تتم لكن لا توجد رسائل فعلية ولا استهلاك من خطة Whats360.'
      : 'Sends hit the sandbox endpoint (sandbox=true). The HTTP call runs but no real messages and no plan quota is consumed.';
  }
  return isAr
    ? 'الإرسال موقوف — يُسجَّل فقط في الـ log بدون أي مكالمة HTTP. مفيد أثناء صيانة الجهاز.'
    : 'Sends are short-circuited to log-only — no HTTP call. Useful while the device is being re-provisioned.';
}

function errMsg(
  r: {
    errorKey: string;
    retryAfterSeconds?: number;
    remainingAttempts?: number;
  },
  isAr: boolean,
): string {
  const map: Record<string, { ar: string; en: string }> = {
    'admin_password.empty': {
      ar: 'كلمة المرور مطلوبة',
      en: 'Password is required',
    },
    'admin_password.mismatch': {
      ar: `كلمة المرور خطأ${r.remainingAttempts !== undefined ? ` (متبقّي ${r.remainingAttempts})` : ''}`,
      en: `Wrong password${r.remainingAttempts !== undefined ? ` (${r.remainingAttempts} left)` : ''}`,
    },
    'admin_password.no_password': {
      ar: 'تعذّر التحقّق من الحساب',
      en: 'Account verification failed',
    },
    'admin_password.rate_limited': {
      ar: r.retryAfterSeconds
        ? `تم تجاوز الحد. حاول بعد ${Math.ceil(r.retryAfterSeconds / 60)} دقيقة.`
        : 'تم تجاوز الحد. حاول لاحقاً.',
      en: r.retryAfterSeconds
        ? `Too many attempts. Try in ${Math.ceil(r.retryAfterSeconds / 60)}m.`
        : 'Too many attempts. Try later.',
    },
    'validation.failed': {
      ar: 'البيانات غير صحيحة',
      en: 'Invalid input',
    },
    'whatsapp.send_failed': {
      ar: 'فشل الإرسال',
      en: 'Send failed',
    },
    'settings.update_failed': {
      ar: 'فشل العملية',
      en: 'Operation failed',
    },
  };
  const entry = map[r.errorKey];
  return entry ? (isAr ? entry.ar : entry.en) : isAr ? 'حدث خطأ' : 'Error';
}

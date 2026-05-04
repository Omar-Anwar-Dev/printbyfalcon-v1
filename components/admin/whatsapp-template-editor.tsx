'use client';

/**
 * Sprint 15 — WhatsApp template bilingual editor.
 *
 * - Two textareas (AR + EN) side-by-side; isActive toggle; Save + Reset buttons.
 * - Variables panel on the right shows every available `{{placeholder}}` with
 *   AR + EN descriptions and a "Copy" affordance for inserting at cursor.
 * - Live preview swaps `{{var}}` with each variable's `example` value so the
 *   admin sees what the customer will actually receive (mirrors the runtime
 *   substitution in `lib/whatsapp/render-template.ts::substituteVariables`).
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateWhatsappTemplateAction,
  resetWhatsappTemplateAction,
} from '@/app/actions/admin-whatsapp-templates';
import type { TemplateVariable } from '@/lib/whatsapp/templates-seed';

type Props = {
  id: string;
  initialBodyAr: string;
  initialBodyEn: string;
  initialIsActive: boolean;
  variables: TemplateVariable[];
  isAr: boolean;
};

/**
 * Mirror of the server-side substitution. Used for live preview only —
 * server-side `lib/whatsapp/render-template.ts::substituteVariables` is the
 * authoritative renderer at send time.
 */
function previewSubstitute(template: string, vars: TemplateVariable[]): string {
  const map: Record<string, string> = {};
  for (const v of vars) map[v.name] = v.example;
  const substituted = template.replace(/\{\{(\w+)\}\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(map, name) ? map[name] : m,
  );
  return substituted.replace(/\n{3,}/g, '\n\n').trim();
}

export function WhatsappTemplateEditor({
  id,
  initialBodyAr,
  initialBodyEn,
  initialIsActive,
  variables,
  isAr,
}: Props) {
  const router = useRouter();
  const [bodyAr, setBodyAr] = useState(initialBodyAr);
  const [bodyEn, setBodyEn] = useState(initialBodyEn);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const arRef = useRef<HTMLTextAreaElement | null>(null);
  const enRef = useRef<HTMLTextAreaElement | null>(null);
  const lastFocused = useRef<'ar' | 'en'>('ar');

  function insertVariable(name: string) {
    const placeholder = `{{${name}}}`;
    const ref = lastFocused.current === 'en' ? enRef.current : arRef.current;
    const setter = lastFocused.current === 'en' ? setBodyEn : setBodyAr;
    const current = lastFocused.current === 'en' ? bodyEn : bodyAr;
    if (!ref) {
      setter(current + placeholder);
      return;
    }
    const start = ref.selectionStart ?? current.length;
    const end = ref.selectionEnd ?? current.length;
    const next = current.slice(0, start) + placeholder + current.slice(end);
    setter(next);
    // Restore caret after the inserted placeholder.
    requestAnimationFrame(() => {
      ref.focus();
      const pos = start + placeholder.length;
      ref.setSelectionRange(pos, pos);
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    start(async () => {
      const res = await updateWhatsappTemplateAction({
        id,
        bodyAr: bodyAr.trim(),
        bodyEn: bodyEn.trim(),
        isActive,
      });
      if (!res.ok) {
        setError(
          isAr ? 'تعذّر الحفظ — حاول مرة أخرى.' : 'Save failed — try again.',
        );
        return;
      }
      setSavedAt(new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US'));
      router.refresh();
    });
  }

  function reset() {
    if (
      !confirm(
        isAr
          ? 'إعادة تعيين القالب لقيمته الافتراضية؟ ستفقد تعديلاتك الحالية.'
          : 'Reset this template to its default? Your current edits will be lost.',
      )
    ) {
      return;
    }
    setError(null);
    setSavedAt(null);
    start(async () => {
      const res = await resetWhatsappTemplateAction({ id });
      if (!res.ok) {
        setError(isAr ? 'تعذّر إعادة التعيين.' : 'Reset failed.');
        return;
      }
      // Reload to reflect the default body server-rendered.
      router.refresh();
    });
  }

  const previewAr = previewSubstitute(bodyAr, variables);
  const previewEn = previewSubstitute(bodyEn, variables);

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        {/* Bilingual editors side-by-side on desktop, stacked on mobile. */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="body-ar">
              {isAr ? 'النص بالعربية' : 'Arabic body'}
            </label>
            <textarea
              id="body-ar"
              ref={arRef}
              value={bodyAr}
              onChange={(e) => setBodyAr(e.target.value)}
              onFocus={() => {
                lastFocused.current = 'ar';
              }}
              rows={14}
              dir="rtl"
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed"
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground">
              {bodyAr.length} / 2000
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="body-en">
              {isAr ? 'النص بالإنجليزية' : 'English body'}
            </label>
            <textarea
              id="body-en"
              ref={enRef}
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              onFocus={() => {
                lastFocused.current = 'en';
              }}
              rows={14}
              dir="ltr"
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed"
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground">
              {bodyEn.length} / 2000
            </p>
          </div>
        </div>

        {/* Live preview with sample data substituted. */}
        <section className="rounded-xl border border-border bg-paper p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {isAr ? 'معاينة (ببيانات تجريبية)' : 'Preview (with sample data)'}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="rounded-md border border-border bg-canvas p-3"
              dir="rtl"
            >
              <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                {isAr ? 'بالعربية' : 'Arabic'}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {previewAr}
              </p>
            </div>
            <div
              className="rounded-md border border-border bg-canvas p-3"
              dir="ltr"
            >
              <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                {isAr ? 'بالإنجليزية' : 'English'}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {previewEn}
              </p>
            </div>
          </div>
        </section>

        {/* Active toggle + actions. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-paper p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <p className="font-medium text-foreground">
                {isAr ? 'تفعيل هذا القالب' : 'Template is active'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? 'لو معطّل، الرسائل بترجع للنص المُبرمَج (السلوك الافتراضي).'
                  : 'When inactive, messages fall back to the code-defined default.'}
              </p>
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-warning/40 hover:text-warning disabled:opacity-60"
            >
              {isAr ? 'إعادة للافتراضي' : 'Reset to default'}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {pending
                ? isAr
                  ? 'جارٍ الحفظ…'
                  : 'Saving…'
                : isAr
                  ? 'حفظ التغييرات'
                  : 'Save changes'}
            </button>
          </div>
        </div>

        {savedAt ? (
          <p className="text-sm text-success">
            {isAr ? `تم الحفظ ${savedAt}` : `Saved at ${savedAt}`}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {/* Variables sidebar. */}
      <aside className="rounded-xl border border-border bg-paper p-5 text-sm lg:sticky lg:top-24 lg:self-start">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {isAr ? 'المتغيرات المتاحة' : 'Available variables'}
        </h3>
        {variables.length === 0 ? (
          <p className="text-muted-foreground">
            {isAr
              ? 'هذا القالب لا يحتوي على متغيرات.'
              : 'This template has no variables.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {variables.map((v) => (
              <li
                key={v.name}
                className="rounded-md border border-border bg-canvas p-3"
              >
                <button
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="block w-full text-start font-mono text-xs font-semibold text-accent-strong hover:underline"
                  title={isAr ? 'إدراج عند موضع المؤشر' : 'Insert at cursor'}
                >
                  {`{{${v.name}}}`}
                </button>
                <p className="mt-1 text-[12px] text-foreground/80">
                  {isAr ? v.descriptionAr : v.descriptionEn}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isAr ? 'مثال:' : 'Example:'}{' '}
                  <span className="font-mono">{v.example}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-md border border-warning/30 bg-warning-soft p-3 text-[11px] text-warning">
          {isAr
            ? 'المتغيرات التي تكتبها بدون موجودة في القائمة فوق ستظهر للعميل كما هي مكتوبة (مثل {{xyz}}).'
            : 'Variables not in the list above will appear literally to the customer (e.g. {{xyz}}).'}
        </p>
      </aside>
    </form>
  );
}

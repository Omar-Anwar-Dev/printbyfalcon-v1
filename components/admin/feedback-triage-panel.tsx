'use client';

import { useState, useTransition } from 'react';
import { FeedbackStatus } from '@prisma/client';
import { updateFeedbackStatusAction } from '@/app/actions/feedback';

const STATUS_LABELS: Record<FeedbackStatus, { ar: string; en: string }> = {
  NEW: { ar: 'جديدة', en: 'New' },
  REVIEWING: { ar: 'قيد المراجعة', en: 'Reviewing' },
  ACTIONED: { ar: 'تم التنفيذ', en: 'Actioned' },
  DISMISSED: { ar: 'مرفوضة', en: 'Dismissed' },
};

export function FeedbackTriagePanel({
  feedbackId,
  initialStatus,
  initialAdminNote,
  isAr,
}: {
  feedbackId: string;
  initialStatus: FeedbackStatus;
  initialAdminNote: string;
  isAr: boolean;
}) {
  const [status, setStatus] = useState<FeedbackStatus>(initialStatus);
  const [adminNote, setAdminNote] = useState(initialAdminNote);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const r = await updateFeedbackStatusAction({
        feedbackId,
        status,
        adminNote,
      });
      if (!r.ok) {
        setError(
          isAr ? 'تعذّر الحفظ — حاول مرة أخرى.' : 'Save failed — try again.',
        );
        return;
      }
      setSavedAt(new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US'));
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map((s) => (
          <label
            key={s}
            className={`flex cursor-pointer items-center gap-2.5 rounded-md border p-3 text-sm ${
              status === s
                ? 'border-accent/40 bg-accent-soft'
                : 'border-border bg-canvas hover:border-accent/30'
            }`}
          >
            <input
              type="radio"
              name="status"
              value={s}
              checked={status === s}
              onChange={() => setStatus(s)}
            />
            <span className="font-medium">
              {STATUS_LABELS[s][isAr ? 'ar' : 'en']}
            </span>
          </label>
        ))}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">
          {isAr ? 'ملاحظة الإدارة (اختياري)' : 'Admin note (optional)'}
        </span>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border bg-background px-3 py-2"
          placeholder={
            isAr
              ? 'مثلاً: تم فتح PR #67؛ سنرد على المُرسل بعد الانتهاء.'
              : 'e.g. Fix opened in PR #67; will reply once shipped.'
          }
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : isAr ? 'حفظ' : 'Save'}
        </button>
        {savedAt ? (
          <span className="text-xs text-success">
            {isAr ? `تم الحفظ ${savedAt}` : `Saved at ${savedAt}`}
          </span>
        ) : null}
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
      </div>
    </form>
  );
}

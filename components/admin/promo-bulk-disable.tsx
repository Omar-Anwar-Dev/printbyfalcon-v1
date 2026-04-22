'use client';

import { useState, useTransition } from 'react';
import { bulkDisableExpiredPromosAction } from '@/app/actions/admin-promo';

export function PromoBulkDisable({ locale }: { locale: 'ar' | 'en' }) {
  const isAr = locale === 'ar';
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const r = await bulkDisableExpiredPromosAction();
            if (r.ok && r.data) {
              setMsg(
                isAr
                  ? `تم تعطيل ${r.data.disabled} كود منتهي الصلاحية.`
                  : `Disabled ${r.data.disabled} expired code(s).`,
              );
            }
          });
        }}
        disabled={pending}
        className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-60"
      >
        {isAr ? 'تعطيل المنتهية' : 'Disable expired'}
      </button>
      {msg ? (
        <span className="text-xs text-muted-foreground">{msg}</span>
      ) : null}
    </div>
  );
}

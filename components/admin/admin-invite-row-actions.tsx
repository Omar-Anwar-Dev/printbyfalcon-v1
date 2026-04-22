'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  resendAdminInviteAction,
  revokeAdminInviteAction,
} from '@/app/actions/admin-users';

export function AdminInviteRowActions({
  id,
  isAr,
}: {
  id: string;
  isAr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const resend = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await resendAdminInviteAction(fd);
      if (!res.ok) alert(res.errorKey);
      else router.refresh();
    });

  const revoke = () => {
    if (!confirm(isAr ? 'إلغاء هذه الدعوة؟' : 'Revoke this invitation?'))
      return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await revokeAdminInviteAction(fd);
      if (!res.ok) alert(res.errorKey);
      else router.refresh();
    });
  };

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={resend} disabled={isPending}>
        {isAr ? 'إعادة إرسال' : 'Resend'}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={revoke}
        disabled={isPending}
      >
        {isAr ? 'إلغاء' : 'Revoke'}
      </Button>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  deactivateAdminAction,
  reactivateAdminAction,
} from '@/app/actions/admin-users';
import { Link } from '@/lib/i18n/routing';

export function AdminUserRowActions({
  userId,
  isSelf,
  isActive,
  isAr,
}: {
  userId: string;
  isSelf: boolean;
  isActive: boolean;
  isAr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const label = isActive
      ? isAr
        ? 'تعطيل هذا المستخدم؟ هيتسجّل خروجه فورًا.'
        : 'Deactivate this user? They will be signed out immediately.'
      : isAr
        ? 'إعادة تفعيل هذا المستخدم؟'
        : 'Reactivate this user?';
    if (!confirm(label)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('userId', userId);
      const res = isActive
        ? await deactivateAdminAction(fd)
        : await reactivateAdminAction(fd);
      if (!res.ok) alert(res.errorKey);
      else router.refresh();
    });
  };

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/users/${userId}`}>{isAr ? 'تعديل' : 'Edit'}</Link>
      </Button>
      {isSelf ? null : (
        <Button
          variant={isActive ? 'destructive' : 'default'}
          size="sm"
          onClick={toggle}
          disabled={isPending}
        >
          {isActive
            ? isAr
              ? 'تعطيل'
              : 'Deactivate'
            : isAr
              ? 'إعادة تفعيل'
              : 'Reactivate'}
        </Button>
      )}
    </div>
  );
}

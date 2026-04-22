'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  deactivateCustomerAction,
  reactivateCustomerAction,
} from '@/app/actions/admin-customers';

export function CustomerStatusToggle({
  userId,
  isActive,
  isAr,
}: {
  userId: string;
  isActive: boolean;
  isAr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const msg = isActive
      ? isAr
        ? 'تعطيل هذا العميل؟ هيتسجّل خروجه فورًا ومايقدرش يدخل تاني.'
        : 'Deactivate this customer? They will be signed out and cannot sign in.'
      : isAr
        ? 'إعادة تفعيل هذا العميل؟'
        : 'Reactivate this customer?';
    if (!confirm(msg)) return;
    startTransition(async () => {
      const fn = isActive ? deactivateCustomerAction : reactivateCustomerAction;
      const res = await fn({ userId });
      if (!res.ok) alert(res.errorKey);
      else router.refresh();
    });
  };

  return (
    <Button
      variant={isActive ? 'destructive' : 'default'}
      onClick={onClick}
      disabled={isPending}
    >
      {isActive
        ? isAr
          ? 'تعطيل العميل'
          : 'Deactivate customer'
        : isAr
          ? 'إعادة تفعيل العميل'
          : 'Reactivate customer'}
    </Button>
  );
}
